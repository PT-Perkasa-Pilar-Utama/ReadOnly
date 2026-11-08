**Version:** 0.2
**Date:** 2026-11-09
**Author:** Tech Lead
**Status:** Diselaraskan dengan kontrak API
**Phase:** Technical Specification

# Loan Lifecycle and Fines - ReadOnly

Keputusan desain untuk lifecycle peminjaman dan perhitungan denda (Q-19, Q-20, Q-22, Q-24).

## Tabel enam status

| Label UI (persis AC) | Kode nilai (`loans.status`) |
| --- | --- |
| Pending Peminjaman | `PENDING` |
| Sedang Dipinjam | `BORROWED` |
| Terlambat | `OVERDUE` |
| Pending Pengembalian | `RETURN_PENDING` |
| Pending Keterlambatan | `FINE_PENDING` |
| Sudah Dikembalikan | `RETURNED` |

> GLOSSARY dan `docs/api-specs/04-loans.md` memuat pemetaan yang sama. Database dan payload API menyimpan kode bahasa Inggris (`PENDING`, dst.) beserta `status_label` bahasa Indonesia untuk UI.

## Mesin status

| Status Awal | Status Tujuan | Aksi | Aktor | Guard | Efek samping |
| --- | --- | --- | --- | --- | --- |
| - | `PENDING` | ajukan peminjaman (AC-08.01) | Member | `available_count > 0` | `INSERT loans`; `late_days = 0`; buat `qr_token_hash` |
| `PENDING` | `BORROWED` | konfirmasi QR (AC-08.03) | Admin | token QR valid & belum dikonsumsi, `available_count > 0` | `available_count - 1`; set `confirmed_at`, `due_date`, `qr_consumed_at`; `loan_events` |
| `BORROWED` | `OVERDUE` | job harian 00:05 WIB (AC-06.03) | system | `due_date < today_wib`, `status = 'BORROWED'`, `return_requested_at IS NULL` | `status = 'OVERDUE'`; hitung `late_days` & `fine_amount` (1–4 hari = 2000, >=5 hari = null); buat notifikasi `OVERDUE`; `loan_events` |
| `BORROWED` | `RETURN_PENDING` | ajukan pengembalian tepat waktu (AC-09.01) | Member | `status = 'BORROWED'`, rating 1–5 wajib | `return_requested_at = now()`; `late_days = 0`; simpan `ratings`; `loan_events` |
| `OVERDUE` | `FINE_PENDING` | ajukan pengembalian terlambat (AC-09.02) | Member | `status = 'OVERDUE'`, rating 1–5 wajib | `return_requested_at = now()`; `late_days` dibekukan; `fine_status = 'Belum Bayar'`; `fine_amount = calculateFine(late_days)`; simpan `ratings`; `loan_events` |
| `FINE_PENDING` | `FINE_PENDING` | pembayaran denda (AC-09.04, AC-09.08) | Admin | `status = 'FINE_PENDING'`, `fine_status = 'Belum Bayar'` | untuk 1–4 hari: `fine_amount = 2000`; untuk >=5 hari: input manual `1..99999999`; set `fine_status = 'Sudah Bayar'`, `fine_paid_at`, `fine_paid_by`; `loan_events` |
| `RETURN_PENDING` | `RETURNED` | konfirmasi pengembalian tepat waktu (AC-09.03) | Admin | `status = 'RETURN_PENDING'` | `available_count + 1`; `returned_at = now()`; `return_confirmed_by`; `loan_events` |
| `FINE_PENDING` | `RETURNED` | konfirmasi pengembalian setelah bayar denda (AC-09.05) | Admin | `status = 'FINE_PENDING'` **dan** `fine_status = 'Sudah Bayar'` | `available_count + 1`; `returned_at = now()`; `return_confirmed_by`; `loan_events` |

Keadaan terminal: **`RETURNED`**. Transisi di luar tabel menghasilkan `InvalidStateTransitionError` (HTTP 422 `invalid_state_transition`).

**Catatan:** setiap transisi dijalankan lewat satu fungsi service `LoanService.transition(...)`. **Dilarang** menetapkan `status` langsung di handler/repo.

## Definisi tanggal dan hari (Q-19, Q-24)

- Zona waktu: **Asia/Jakarta** (WIB). Timestamp di database disimpan dalam UTC (`timestamptz`).
- `due_date` = tanggal kalender WIB dari `confirmed_at` + 7 hari.
- Job harian (00:05 WIB) menghitung `late_days = datediff_wib(due_date, today_wib)` bila `status = 'BORROWED'` dan `due_date < today_wib`.
- `late_days` **dibekukan** pada saat Member mengajukan pengembalian (`return_requested_at`), sehingga keterlambatan tidak bertambah selama menunggu konfirmasi Admin.
- Job harian tidak mengubah peminjaman yang sudah memiliki `return_requested_at IS NOT NULL` (status `RETURN_PENDING` atau `FINE_PENDING`, Q-24).

Contoh bertanggal:

```text
confirmed_at = 2026-11-01 10:00 WIB
due_date     = 2026-11-08
now          = 2026-11-09 00:05 WIB -> job: status = OVERDUE, late_days = 1
```

`late_days` dihitung dari selisih hari kalender WIB; hari terlambat pertama dimulai pada hari kalender berikutnya setelah `due_date`.

## Fungsi denda murni

```ts
// packages/shared/src/constants.ts
export const LOAN_DURATION_DAYS = 7;
export const REMINDER_DAYS_BEFORE_DUE = 3;
export const FINE_FLAT_AMOUNT = 2000;         // Rp 2.000 flat untuk 1-4 hari
export const FINE_AUTO_MAX_DAYS = 4;          // 1-4 hari otomatis
export const FINE_MANUAL_MIN_DAYS = 5;        // >= 5 hari input manual Admin
export const FINE_MANUAL_MAX = 99_999_999;    // batas atas input Admin
export const MAX_COVER_SIZE_BYTES = 5 * 1024 * 1024; // 5 MiB

export function calculateFine(lateDays: number): number | null {
  if (lateDays <= 0) return 0;
  if (lateDays <= FINE_AUTO_MAX_DAYS) return FINE_FLAT_AMOUNT;
  return null; // Admin input manual
}
```

| lateDays | Hasil `calculateFine` |
| --- | --- |
| 0 | `0` |
| 1 | `2000` |
| 4 | `2000` |
| 5 | `null` (input manual) |
| 6 | `null` (input manual) |

## Sub-status pembayaran (Q-21, Q-22, Q-23)

- Satu kolom `fine_amount`; label UI `"Biaya Denda"` dan `"Total Denda"` menampilkan nilai yang sama.
- `fine_status`: `'Belum Bayar'` (default saat masuk `OVERDUE` / `FINE_PENDING`) atau `'Sudah Bayar'` (setelah pelunasan AC-09.04 / AC-09.08).
- AC-09.04 (1–4 hari): alert rekonfirmasi `"Denda {member_name} adalah {total_denda}. Apakah benar telah dibayar?"`.
- AC-09.08 (≥5 hari): pop up `"Biaya Denda"` (input manual wajib angka bulat `1..99.999.999`).
- Pembayaran tunai di tempat; sistem mencatat `fine_paid_at` dan `fine_paid_by` (Q-23).
- Guard pengembalian: pada status `FINE_PENDING`, tombol `"Konfirmasi Pengembalian"` disable sampai `fine_status = 'Sudah Bayar'` (AC-09.04, AC-09.05).

## Tipe antarmuka TypeScript

```ts
export const LOAN_STATUSES = [
  'PENDING',
  'BORROWED',
  'OVERDUE',
  'RETURN_PENDING',
  'FINE_PENDING',
  'RETURNED',
] as const;

export type LoanStatus = (typeof LOAN_STATUSES)[number];

export const LOAN_STATUS_LABELS: Record<LoanStatus, string> = {
  PENDING: 'Pending Peminjaman',
  BORROWED: 'Sedang Dipinjam',
  OVERDUE: 'Terlambat',
  RETURN_PENDING: 'Pending Pengembalian',
  FINE_PENDING: 'Pending Keterlambatan',
  RETURNED: 'Sudah Dikembalikan',
};
```

## What This Does NOT Do

- Tanpa pembatalan pinjaman, kedaluwarsa `PENDING`, cicilan, pembebasan denda, buku hilang, payment gateway, atau pelacakan eksemplar per barcode.

## Cross-References

- [13-stock-integrity-and-concurrency.md](13-stock-integrity-and-concurrency.md)
- [15-scheduler-and-notifications.md](15-scheduler-and-notifications.md)
- [api-specs/04-loans.md](../api-specs/04-loans.md)
- [docs/business/acceptance-criteria-breakdown/acceptance-criteria-sprint-3.md](../business/acceptance-criteria-breakdown/acceptance-criteria-sprint-3.md)
- [GLOSSARY.md](../GLOSSARY.md)

## Open Follow-ups

Q-16 (pembatalan/ekspirasi PENDING), Q-17 (batas pinjaman aktif), Q-36 (format Nomor Pinjaman + tanggal).
