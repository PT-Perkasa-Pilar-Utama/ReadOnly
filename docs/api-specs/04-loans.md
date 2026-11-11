**Version:** 0.2
**Date:** 2026-11-09
**Author:** Tech Lead
**Status:** Baseline kontrak API diselaraskan
**Phase:** API Specification

# Loans API - ReadOnly

Base: `/api/v1`

## Pemetaan Kode Status & Label UI Kanonik

API mengirim kode status bahasa Inggris (`status`) sekaligus label UI bahasa Indonesia (`status_label`) agar FE dapat merender teks persis AC tanpa duplikasi logika:

| Kode (`status`) | Label UI (`status_label`) | Aksi Member di Halaman Pinjaman (AC-08.05) |
| --- | --- | --- |
| `PENDING` | `Pending Peminjaman` | tombol `"QR"` |
| `BORROWED` | `Sedang Dipinjam` | tombol `"Kembalikan"` |
| `OVERDUE` | `Terlambat` | tombol `"Kembalikan"` |
| `RETURN_PENDING` | `Pending Pengembalian` | keterangan `"Menunggu admin"` |
| `FINE_PENDING` | `Pending Keterlambatan` | keterangan `"Menunggu admin"` |
| `RETURNED` | `Sudah Dikembalikan` | keterangan `"Selesai"` |

## POST /loans (ajukan peminjaman, Member)

- **Purpose:** buat peminjaman berstatus `PENDING` (`"Pending Peminjaman"`, AC-08.01, AC-08.04).
- **Access:** member.
- **Input:** `{ "book_id": "uuid" }`.
- **Behavior:** validasi buku aktif (`deleted_at IS NULL`) dan `available_count > 0`; buat token QR 128-bit CSPRNG, simpan SHA-256 hash di `qr_token_hash`, lalu `INSERT loans` dengan `status = 'PENDING'`, `requested_at = now()`, dan `loan_no` berformat `PJM-YYYYMMDD-####`. Stok fisik belum dikurangi pada langkah ini (dikurangi saat konfirmasi QR Admin sesuai AC-08.03).
- **Output:** HTTP 201 `{ "data": { "id": "uuid", "loan_no": "PJM-20261109-0001", "status": "PENDING", "status_label": "Pending Peminjaman" }, "message": "Pengajuan peminjaman berhasil" }`.
- **Errors:** `session_not_found` 401, `forbidden` 403, `not_found` 404, `conflict` 409 `"Buku tidak tersedia (stok habis)"` (AC-08.04) `[COPY-TBD Q-15]`.
- **Traceability:** AC-08.01, AC-08.04.

## GET /loans/me (daftar pinjaman member)

- **Purpose:** daftar pinjaman saya di halaman Pinjaman (AC-08.05).
- **Access:** member (hanya pinjaman milik `user_id` sesi aktif, SEC-05).
- **Query:** `page` default `1`, `limit` default `10` dan maksimum `50`.
- **Output:** HTTP 200 paginasi berisi:

```json
{
  "data": [
    {
      "id": "uuid",
      "loan_no": "PJM-20261109-0001",
      "book_id": "uuid",
      "book_title": "string",
      "book_author": "string",
      "book_cover_url": "/api/v1/covers/uuid.jpg",
      "requested_at": "2026-11-09T03:00:00.000Z",
      "due_date": "2026-11-16",
      "status": "PENDING",
      "status_label": "Pending Peminjaman",
      "member_action": "QR"
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 }
}
```

- **Catatan field:** Untuk `status === 'PENDING'`, UI menampilkan `requested_at` (Tanggal permintaan) dan tombol `"QR"`. Untuk status lainnya, UI menampilkan `due_date` (Batas pengembalian) dan aksi sesuai tabel kanonik (`"QR"` | `"Kembalikan"` | `"Menunggu admin"` | `"Selesai"`).
- **Traceability:** AC-08.05.

## GET /loans/:id/qr

- **Purpose:** ambil/rotasi token QR untuk ditampilkan pada pop up `"QR Code Peminjaman"` dan dipindai Admin Perpus (AC-08.02).
- **Access:** member (pemilik), **hanya untuk peminjaman berstatus `PENDING`** (`"Pending Peminjaman"`).
- **Behavior:** pastikan peminjaman milik Member yang login dan berstatus `PENDING` serta `qr_consumed_at IS NULL`. Hasilkan token QR 128-bit CSPRNG baru, perbarui `qr_token_hash = sha256(token)` di database, dan kembalikan plaintext `qr_token` ke klien untuk dirender menjadi gambar QR lokal (Opsi B spek 14).
- **Output:** HTTP 200 `{ "data": { "loan_id": "uuid", "loan_no": "PJM-20261109-0001", "qr_token": "base64url-string" } }`.
- **Errors:** `session_not_found` 401, `forbidden` 403 bila bukan pemilik, `not_found` 404, `invalid_state_transition` 422 bila status bukan `PENDING`.
- **Traceability:** AC-08.02.

## POST /admin/loans/qr/preview (scan QR pratinjau)

- **Purpose:** pratinjau detail peminjaman dari hasil scan QR untuk mengisi pop up `"Konfirmasi Peminjaman"` sebelum Admin menekan tombol konfirmasi (AC-08.03, AC-08.06).
- **Access:** admin.
- **Input:** `{ "qr_token": "string" }`.
- **Behavior:** verifikasi `sha256(qr_token)` terhadap `loans.qr_token_hash` dengan syarat `status = 'PENDING'` dan `qr_consumed_at IS NULL`. Endpoint ini **tidak** mengonsumsi token dan **tidak** mengubah status/stok.
- **Output:** HTTP 200:

```json
{
  "data": {
    "loan_id": "uuid",
    "loan_no": "PJM-20261109-0001",
    "borrower_name": "string",
    "requested_at": "2026-11-09T03:00:00.000Z",
    "loan_duration_days": 7,
    "book": {
      "id": "uuid",
      "title": "string",
      "author": "string",
      "publisher": "string",
      "publication_year": 2024,
      "cover_url": "/api/v1/covers/uuid.jpg",
      "genres": ["string"]
    }
  }
}
```

- **Rate limit:** per IP (SEC-06).
- **Errors:** ` invalid_token` 422 dengan message `"QR Code tidak valid"` (AC-08.06) bila hash tidak ditemukan, token sudah dipakai, atau status bukan `PENDING`.
- **Traceability:** AC-08.03, AC-08.06.

## POST /admin/loans/qr/confirm (konfirmasi peminjaman, sekali pakai)

- **Purpose:** konsumsi token QR, kurangi stok buku secara atomik, dan ubah status menjadi `BORROWED` (`"Sedang Dipinjam"`, AC-08.03, AC-08.06).
- **Access:** admin.
- **Input:** `{ "qr_token": "string" }`.
- **Behavior:** dalam satu transaksi database melalui `LoanService.transition`:
  1. Cari peminjaman `WHERE qr_token_hash = sha256(qr_token) AND status = 'PENDING' AND qr_consumed_at IS NULL`. Bila tidak ada -> HTTP 422 `invalid_token` (`"QR Code tidak valid"`, AC-08.06).
  2. Jalankan conditional decrement: `UPDATE books SET available_count = available_count - 1 WHERE id = book_id AND available_count > 0`. Bila 0 baris ter-update -> rollback transaksi dan kembalikan HTTP 409 `conflict` (`"Buku tidak tersedia (stok habis)"`, Q-15).
  3. Update `loans`: `status = 'BORROWED'`, `confirmed_at = now()`, `confirmed_by = adminId`, `due_date = confirmed_date_wib + 7 days`, `qr_token_hash = NULL`, `qr_consumed_at = now()`.
  4. Insert baris audit ke `loan_events` (`from_status: 'PENDING'`, `to_status: 'BORROWED'`, `actor_id: adminId`).
- **Output:** HTTP 200 `{ "data": { "loan_id": "uuid", "status": "BORROWED", "status_label": "Sedang Dipinjam", "due_date": "2026-11-16" }, "message": "Buku berhasil Dipinjam" }`.
- **Errors:** `invalid_token` 422 `"QR Code tidak valid"` (AC-08.06), `conflict` 409 `"Buku tidak tersedia (stok habis)"` (Q-15).
- **Traceability:** AC-08.03, AC-08.06.

## GET /admin/loans (daftar pinjaman Admin)

- **Purpose:** halaman Manajemen Peminjaman Admin (AC-06.01).
- **Access:** admin.
- **Query:** `status` opsional (`BORROWED` | `OVERDUE` | `RETURN_PENDING` | `FINE_PENDING` | `RETURNED`), `q` opsional, `page` default `1`, `limit` default `10` dan maksimum `50`.
- **Behavior:** menampilkan peminjaman pada 5 status pasca-konfirmasi (semua status kecuali `PENDING`, Q-25).
- **Output:** HTTP 200 paginasi berisi `{ id, loan_no, borrower_name, book_title, book_author, book_cover_url, confirmed_at, due_date, status, status_label, late_days, fine_amount, fine_status }`.
- **Traceability:** AC-06.01.

## GET /admin/loans/:id (detail peminjaman Admin)

- **Purpose:** melihat detail peminjaman, keterlambatan, dan rincian denda (AC-06.02, AC-09.03, AC-09.04, AC-09.05, AC-09.08).
- **Access:** admin.
- **Output:** HTTP 200:

```json
{
  "data": {
    "id": "uuid",
    "loan_no": "PJM-20261101-0001",
    "status": "FINE_PENDING",
    "status_label": "Pending Keterlambatan",
    "borrower": { "id": "uuid", "full_name": "string", "email": "string" },
    "book": {
      "id": "uuid",
      "title": "string",
      "author": "string",
      "publisher": "string",
      "publication_year": 2024,
      "synopsis": "string",
      "cover_url": "/api/v1/covers/uuid.jpg",
      "genres": ["string"]
    },
    "confirmed_at": "2026-11-01T03:00:00.000Z",
    "due_date": "2026-11-08",
    "return_requested_at": "2026-11-10T03:00:00.000Z",
    "late_days": 2,
    "fine_amount": 2000,
    "fine_status": "Belum Bayar",
    "can_pay_fine": true,
    "can_confirm_return": false
  }
}
```

- **Catatan perhitungan denda (AC-06.02, AC-09.04, AC-09.08):**
  - Bila `late_days` antara 1 s/d 4 hari: `fine_amount` otomatis bernilai `2000` (Rp 2.000 flat).
  - Bila `late_days >= 5` dan `fine_status === 'Belum Bayar'`: `fine_amount` bernilai `null` sampai Admin menginput nominal manual melalui endpoint pembayaran denda (AC-09.08).
  - Untuk status `FINE_PENDING`: selama `fine_status === 'Belum Bayar'`, `can_pay_fine = true` dan `can_confirm_return = false` (tombol Konfirmasi Pengembalian disable). Setelah `fine_status === 'Sudah Bayar'`, `can_pay_fine = false` dan `can_confirm_return = true` (AC-09.04, AC-09.05).
- **Traceability:** AC-06.02, AC-09.03, AC-09.04, AC-09.05, AC-09.08.

## POST /admin/loans/:id/fine-payment (pembayaran denda)

- **Purpose:** mencatat pelunasan denda untuk peminjaman berstatus `FINE_PENDING` (`"Pending Keterlambatan"`, AC-09.04, AC-09.08, AC-09.09).
- **Access:** admin.
- **Input:** `{ "amount"?: number }` (opsional/diabaikan untuk `late_days` 1–4 karena dihitung server `calculateFine(late_days) = 2000`; **wajib** berupa bilangan bulat `1..99999999` untuk `late_days >= 5`).
- **Behavior:**
  - Guard: peminjaman harus berstatus `FINE_PENDING` dan `fine_status = 'Belum Bayar'`.
  - Untuk `1 <= late_days <= 4`: tetapkan `fine_amount = 2000`.
  - Untuk `late_days >= 5`: validasi `amount` adalah angka bulat positif `1..99999999`; bila kosong atau bukan angka valid -> HTTP 422 `"Biaya denda wajib diisi dengan angka"` (AC-09.09).
  - Set `fine_amount`, `fine_status = 'Sudah Bayar'`, `fine_paid_at = now()`, `fine_paid_by = adminId`, dan catat di `loan_events`.
- **Output:** HTTP 200 `{ "data": { "loan_id": "uuid", "fine_amount": 2000, "fine_status": "Sudah Bayar" }, "message": "Denda Berhasil Dibayar" }`.
- **Errors:** `invalid_request` 422 `"Biaya denda wajib diisi dengan angka"` (AC-09.09), `invalid_state_transition` 422 bila status bukan `FINE_PENDING` atau denda sudah dibayar.
- **Traceability:** AC-09.04, AC-09.08, AC-09.09.

## POST /loans/:id/return (ajukan pengembalian + rating, Member)

- **Purpose:** Member mengajukan pengembalian buku disertai rating bintang 1–5 wajib (AC-09.01, AC-09.02, AC-09.06).
- **Access:** member (pemilik).
- **Input:** `{ "score": number }` (integer 1 s/d 5 wajib).
- **Behavior:** dalam satu transaksi melalui `LoanService.transition`:
  1. Validasi `score` integer `1..5`; bila tidak diisi/tidak valid -> HTTP 422 `"Rating wajib diisi"` (AC-09.06).
  2. Jika `status === 'BORROWED'` -> ubah `status = 'RETURN_PENDING'` (`"Pending Pengembalian"`, AC-09.01), `late_days = 0`, `fine_amount = 0`.
  3. Jika `status === 'OVERDUE'` -> ubah `status = 'FINE_PENDING'` (`"Pending Keterlambatan"`, AC-09.02), bekukan `late_days` pada saat `return_requested_at = now()`, set `fine_status = 'Belum Bayar'`, dan set `fine_amount = 2000` (jika `1 <= late_days <= 4`) atau `null` (jika `late_days >= 5`).
  4. Simpan rating ke tabel `ratings` dan catat transisi di `loan_events`.
- **Output:** HTTP 200 `{ "data": { "loan_id": "uuid", "status": "RETURN_PENDING", "status_label": "Pending Pengembalian" }, "message": "Pengembalian diajukan" }`.
- **Errors:** `invalid_request` 422 `"Rating wajib diisi"` (AC-09.06), `invalid_state_transition` 422 bila status awal bukan `BORROWED` atau `OVERDUE`.
- **Traceability:** AC-09.01, AC-09.02, AC-09.06.

## POST /admin/loans/:id/return-confirmation (konfirmasi pengembalian)

- **Purpose:** menyelesaikan pengembalian buku dan menambah kembali `available_count` secara atomik (AC-09.03, AC-09.05).
- **Access:** admin.
- **Input:** none.
- **Behavior:** dalam satu transaksi melalui `LoanService.transition`:
  - Jika `status === 'RETURN_PENDING'`: langsung diizinkan.
  - Jika `status === 'FINE_PENDING'`: wajib memeriksa `fine_status === 'Sudah Bayar'`; bila belum bayar -> tolak dengan HTTP 403/422.
  - Update `loans` menjadi `status = 'RETURNED'`, `returned_at = now()`, `return_confirmed_by = adminId`; update `books SET available_count = available_count + 1`; catat di `loan_events`.
- **Output:** HTTP 200 `{ "data": { "loan_id": "uuid", "status": "RETURNED", "status_label": "Sudah Dikembalikan" }, "message": "Buku berhasil Dikembalikan" }`.
- **Errors:** `invalid_state_transition` 422, `forbidden` 403 bila denda pada `FINE_PENDING` belum dibayar.
- **Traceability:** AC-09.03, AC-09.05.

## Cross-References

- [01-conventions.md](01-conventions.md)
- [12-loan-lifecycle-and-fines.md](../technical-specs/12-loan-lifecycle-and-fines.md)
- [13-stock-integrity-and-concurrency.md](../technical-specs/13-stock-integrity-and-concurrency.md)
- [14-qr-borrow-confirmation.md](../technical-specs/14-qr-borrow-confirmation.md)
- [15-scheduler-and-notifications.md](../technical-specs/15-scheduler-and-notifications.md)
- [docs/business/acceptance-criteria.md](../business/acceptance-criteria.md)

## Operations traceability matrix

| AC | Operasi | Status |
| --- | --- | --- |
| AC-06.01 | GET /admin/loans | OK |
| AC-06.02 | GET /admin/loans/:id | OK |
| AC-08.01 | POST /loans | TODO |
| AC-08.02 | GET /loans/:id/qr | TODO |
| AC-08.03 | POST /admin/loans/qr/preview, POST /admin/loans/qr/confirm | TODO |
| AC-08.04 | POST /loans (409) | TODO |
| AC-08.05 | GET /loans/me | TODO |
| AC-08.06 | POST /admin/loans/qr/preview, POST /admin/loans/qr/confirm | TODO |
| AC-09.01, AC-09.02, AC-09.06 | POST /loans/:id/return | TODO |
| AC-09.03, AC-09.05 | POST /admin/loans/:id/return-confirmation | TODO |
| AC-09.04, AC-09.08, AC-09.09 | POST /admin/loans/:id/fine-payment | TODO |
