**Version:** 0.1  
**Date:** 2026-11-05  
**Author:** Tech Lead  
**Status:** Draft  
**Phase:** Deployment Plan  

# Database Reset - ReadOnly

Desain prosedur reset schema + seed untuk Development, Test/CI, dan harness e2e; belum diimplementasikan. Kartu DB dan route operasional terkait harus selesai sebelum langkah ini dapat dijalankan. **Reset production tidak terdaftar.**

## 1. Kebijakan per lingkungan

| Lingkungan | Mekanisme | Route `POST /admin/reset-state` |
| --- | --- | --- |
| Development | Target setelah kartu DB dan endpoint operasional; `ENABLE_RESET_API=true`, `RESET_STATE_SEED=dev` | Belum tersedia |
| Test / CI / e2e | Target setelah kartu DB dan wiring, seed `qa` | Belum tersedia |
| Staging | `ENABLE_RESET_API=false` | Tidak terdaftar |
| **Production** | `APP_ENV=production`, flag **tidak ada** | **Tidak terdaftar. Bukan 403. Harus 404.** |

Kalimat tegas (SEC-13):

> **Reset database production tidak terdaftar.** Handler `POST /admin/reset-state` tidak dimasukkan ke router bila `APP_ENV === 'production'`. Permintaan ke path itu di production menghasilkan 404 yang sama dengan path yang memang tidak ada. Otorisasi admin **bukan** pengaman yang cukup.

`POST /admin/jobs/run` mengikuti aturan yang sama.

## 2. Perilaku reset non-prod

Urutan target di dalam handler (setelah schema/migrasi dan kartu endpoint operasional tersedia):

1. Tolak jika `APP_ENV === 'production'` (route tidak sampai sini).
2. Truncate / drop schema public (atau `drizzle` reset) di dalam transaksi.
3. Jalankan migrasi ke head. Perintah migrate menyelesaikan path sendiri.
4. Seed sesuai query `?seed=dev|qa`.
5. Kembalikan hitungan baris per tabel.

## 3. Seed Dev vs Seed QA

- **Dev:** Admin dari env, daftar genre, beberapa judul buku dengan `available_count` > 0. Cukup untuk klik manual.
- **QA:** Dev + matriks pinjaman di bawah. Dipakai Playwright e2e (kartu wiring Sprint 1–3) dan uji Dashboard (AC-04.01).

Seed QA **idempoten** dan dikontrol versi di `packages/db/seeds/qa.ts`. Tanggal pinjaman relatif terhadap Clock port, bukan `Date.now()` mentah, agar job harian bisa diuji.

## 4. Matriks seed QA

Enam status pinjaman (label UI persis AC). Fine bounds 0 / 1 / 4 / 5 / 6.

| Seed ID | Status | late_days | fine_amount | fine_status | Buku (stock awal) | available_count setelah seed | Dipakai untuk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| QA-L-PEND | PENDING | 0 | 0 | Belum Bayar | Book-A (total 2) | 2 (stok belum berkurang) | AC-08.03 konfirmasi QR |
| QA-L-BORROW-0 | BORROWED | 0 | 0 | Belum Bayar | Book-B (total 3) | 2 | AC-09.01 pengembalian tepat waktu; AC-05.09 tolak hapus |
| QA-L-OVER-1 | OVERDUE | 1 | 2000 (hitung server, belum bayar) | Belum Bayar | Book-C (total 1) | 0 | AC-09.04 denda 1–4 hari; bound bawah 1 |
| QA-L-OVER-4 | OVERDUE | 4 | 2000 (hitung server, belum bayar) | Belum Bayar | Book-D (total 1) | 0 | AC-09.04 bound atas otomatis 4 |
| QA-L-OVER-5 | OVERDUE | 5 | null (input manual) | Belum Bayar | Book-E (total 1) | 0 | AC-09.08, AC-09.09, AC-09.10 bound 5 |
| QA-L-OVER-6 | OVERDUE | 6 | null (input manual) | Belum Bayar | Book-F (total 1) | 0 | AC-09.08 bound >5 (6) |
| QA-L-RET-PEND | RETURN_PENDING | 0 | 0 | Belum Bayar | Book-G (total 2) | 1 | AC-09.03 konfirmasi pengembalian |
| QA-L-FINE-PEND | FINE_PENDING | 5 | 15000 (sudah diisi, belum flag bayar sesuai Q-21) | Belum Bayar | Book-H (total 1) | 0 | AC-09.04 / AC-09.05 jalur denda |
| QA-L-FINE-PAID | FINE_PENDING | 5 | 15000 | Sudah Bayar | Book-I (total 1) | 0 | AC-09.05 konfirmasi setelah bayar |
| QA-L-RETURNED-ON | RETURNED | 0 | 0 | Belum Bayar | Book-J (total 2) | 2 (sudah +1) | pieChart onTime |
| QA-L-RETURNED-LATE | RETURNED | 3 | 2000 | Sudah Bayar | Book-K (total 1) | 1 | pieChart late |

Tambahan seed QA yang bukan pinjaman:

| Seed ID | Entitas | Nilai | Dipakai untuk |
| --- | --- | --- | --- |
| QA-BOOK-EMPTY | Book-Empty | total_count 1, available_count 0, tanpa pinjaman aktif (semua RETURNED atau stok 0 karena BORROWED lain) | AC-08.04 Buku Tidak Tersedia |
| QA-BOOK-ACTIVE | Book-B di atas | ada pinjaman BORROWED | AC-05.09 hapus ditolak |
| QA-USER-MEMBER-1 | Member A | genre overlap dengan Book-B | AC-07.01 rekomendasi |
| QA-USER-MEMBER-2 | Member B | untuk race stok terakhir (Q-15) | FE-S2-04 |
| QA-USER-ADMIN | Admin | dari `ADMIN_EMAIL` | seluruh alur Admin |
| QA-NOTIF-3D | notification DUE_SOON_3D | terikat QA-L-BORROW-0 dengan due_date = today+3 | AC-10.02 |
| QA-NOTIF-TODAY | notification DUE_TODAY | terikat pinjaman due_date = today | AC-10.01 |
| QA-NOTIF-OVER | notification OVERDUE | terikat QA-L-OVER-1 | AC-10.03 |

Fine bounds yang **wajib** ada di seed (bukan hanya di tes unit `calculateFine`):

| late_days | Harapan `calculateFine` | UI Admin |
| --- | --- | --- |
| 0 | 0 | tidak ada denda |
| 1 | 2000 | alert rekonfirmasi (AC-09.04) |
| 4 | 2000 | alert rekonfirmasi (AC-09.04) |
| 5 | null | pop up "Biaya Denda" (AC-09.08) |
| 6 | null | pop up "Biaya Denda" (AC-09.08) |

## 5. Aritmetika nilai harapan Dashboard (AC-04.01, Q-26)

Hitungan di bawah **hanya** dari baris pinjaman dan buku pada tabel matriks bagian 4 (belum termasuk Book-Empty). Jika seed ditambah, tabel ini wajib dihitung ulang di PR yang sama.

Definisi dari [06-dashboard.md](../api-specs/06-dashboard.md):

- `totalBooks` = jumlah judul aktif (`deleted_at IS NULL`).
- `totalAvailability` = SUM(`available_count`).
- `borrowedCount` = loans `BORROWED` **atau** `RETURN_PENDING`.
- `overdueCount` = loans `OVERDUE` **atau** `FINE_PENDING`.
- `returnedCount` = loans `RETURNED`.
- `pieChart.onTime` = loans `RETURNED` dengan `late_days = 0`.
- `pieChart.late` = loans `RETURNED` dengan `late_days > 0`.

Aritmetika dari matriks:

```
Judul aktif:
  Book-A, B, C, D, E, F, G, H, I, J, K, Empty = 12
  totalBooks = 12

available_count:
  A2 + B2 + C0 + D0 + E0 + F0 + G1 + H0 + I0 + J2 + K1 + Empty0 = 8
  totalAvailability = 8

borrowedCount:
  QA-L-BORROW-0 (BORROWED) + QA-L-RET-PEND (RETURN_PENDING) = 2

overdueCount:
  OVER-1, OVER-4, OVER-5, OVER-6 (4 OVERDUE)
  + FINE-PEND, FINE-PAID (2 FINE_PENDING)
  = 6

returnedCount:
  RETURNED-ON + RETURNED-LATE = 2

pieChart.onTime = 1 (RETURNED-ON)
pieChart.late   = 1 (RETURNED-LATE)
```

Nilai harapan GET `/admin/dashboard/summary` setelah `?seed=qa`:

```json
{
  "data": {
    "totalBooks": 12,
    "totalAvailability": 8,
    "borrowedCount": 2,
    "overdueCount": 6,
    "returnedCount": 2,
    "pieChart": { "onTime": 1, "late": 1 }
  }
}
```

Tes e2e Dashboard (FE-S2-03 / wiring) **membandingkan angka ini**, bukan angka hardcode yang menyimpang dari seed. Jika baris seed berubah, aritmetika di bagian ini dan tes berubah bersama.

PENDING (QA-L-PEND) **tidak** masuk `borrowedCount` maupun `overdueCount`.

## 6. Relasi tanggal untuk job (AC-06.03, AC-10.*)

Seed menulis `confirmed_at` / `due_date` relatif terhadap Clock:

- BORROW-0: `due_date = today + 7`.
- Pinjaman untuk DUE_SOON_3D: `due_date = today + 3`.
- Pinjaman untuk DUE_TODAY: `due_date = today`.
- OVERDUE late_days N: `due_date = today - N` (hari kalender WIB, Q-19).

Harness e2e memanggil `POST /admin/jobs/run` (non-prod) setelah seed, bukan menunggu 00:05 WIB.

## Cross-References

- [01-environments.md](01-environments.md)
- [07-database-debugging.md](07-database-debugging.md)
- [../api-specs/06-dashboard.md](../api-specs/06-dashboard.md)
- [../api-specs/07-system.md](../api-specs/07-system.md)
- [../technical-specs/11-environment-configuration.md](../technical-specs/11-environment-configuration.md)
- [../technical-specs/12-loan-lifecycle-and-fines.md](../technical-specs/12-loan-lifecycle-and-fines.md)
