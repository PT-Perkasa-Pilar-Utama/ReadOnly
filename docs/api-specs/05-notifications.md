**Version:** 0.2
**Date:** 2026-11-09
**Author:** Tech Lead
**Status:** Baseline kontrak API diselaraskan
**Phase:** API Specification

# Notifications API - ReadOnly

Base: `/api/v1/notifications`

## GET /notifications

- **Purpose:** daftar notifikasi persisten milik Member (terbaru dulu) sekaligus menyediakan payload terstruktur untuk **popup reminder saat login** (AC-10.01 s/d AC-10.08).
- **Access:** member (pemilik).
- **Query:** `page` default `1`, `limit` default `10` dan maksimum `50`.
- **Output:** HTTP 200:

```json
{
  "data": [
    {
      "id": "uuid",
      "loan_id": "uuid",
      "type": "DUE_SOON_3D",
      "title": "Batas pengembalian 3 hari lagi",
      "text": "Bumi Manusia perlu dikembalikan paling lambat 16 November 2026.",
      "book_title": "Bumi Manusia",
      "due_date": "2026-11-16",
      "created_at": "2026-11-13T00:05:00.000Z"
    }
  ],
  "login_popups": [
    {
      "condition": "OVERDUE",
      "books": [
        {
          "loan_id": "uuid",
          "book_title": "Laskar Pelangi",
          "due_date": "2026-11-05",
          "late_days": 4,
          "message": "Laskar Pelangi terlambat 4 hari. Segera ajukan pengembalian."
        }
      ]
    },
    {
      "condition": "DUE_TODAY",
      "books": [
        {
          "loan_id": "uuid",
          "book_title": "Filosofi Teras",
          "due_date": "2026-11-09",
          "message": "Filosofi Teras jatuh tempo hari ini. Silakan dikembalikan."
        }
      ]
    },
    {
      "condition": "DUE_SOON",
      "books": [
        {
          "loan_id": "uuid",
          "book_title": "Bumi Manusia",
          "due_date": "2026-11-11",
          "remaining_days": 2,
          "message": "Batas pengembalian 2 hari lagi"
        }
      ]
    }
  ],
  "pagination": { "page": 1, "limit": 10, "total": 1, "totalPages": 1 }
}
```

- **Aturan `login_popups` (AC-10.04 s/d AC-10.08):**
  - Dihitung secara dinamis dari pinjaman aktif milik Member pada tanggal hari ini (WIB):
    1. `OVERDUE` (`status = 'OVERDUE'`): teks `{judul_buku} terlambat {jumlah_hari} hari. Segera ajukan pengembalian.` (AC-10.06).
    2. `DUE_TODAY` (`status = 'BORROWED'` dan `due_date = today_wib`): teks `{judul_buku} jatuh tempo hari ini. Silakan dikembalikan.` (AC-10.05).
    3. `DUE_SOON` (`status = 'BORROWED'` dan `remaining_days` antara `1..3`): teks `Batas pengembalian {sisa_hari} hari lagi` beserta judul buku dan `due_date` (AC-10.04).
  - Array `login_popups` sudah diurutkan server sesuai prioritas AC-10.07: **`OVERDUE` -> `DUE_TODAY` -> `DUE_SOON`** (hanya kondisi yang memiliki minimal 1 buku yang dikirim).
  - Setiap popup tampil selama **3 detik** sekali setiap kali login; menekan tombol `X` menutup popup saat ini lebih cepat dan menampilkan popup berikutnya tanpa menghapus item pada `data` daftar notifikasi (AC-10.08).
- **Traceability:** AC-10.01–AC-10.08.

## Cross-References

- [01-conventions.md](01-conventions.md)
- [15-scheduler-and-notifications.md](../technical-specs/15-scheduler-and-notifications.md)
- [docs/business/acceptance-criteria.md](../business/acceptance-criteria.md)
- [docs/business/acceptance-criteria-addendum.md](../business/acceptance-criteria-addendum.md)
