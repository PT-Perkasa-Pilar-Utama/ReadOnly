**Version:** 0.2
**Date:** 2026-11-08
**Author:** Tech Lead
**Status:** Baseline API; implementation pending
**Phase:** API Specification

# API Specs - ReadOnly

Base address: `/api/v1`

## File structure

1. [01-conventions.md](01-conventions.md) - envelope, status/error codes, roles, message catalog
2. [02-authentication.md](02-authentication.md) - register, login, logout, me, genres, Management User
3. [03-books.md](03-books.md) - katalog, detail, Master Buku CRUD, upload cover, Master Genre
4. [04-loans.md](04-loans.md) - peminjaman Member/Admin, QR, pengembalian, denda
5. [05-notifications.md](05-notifications.md) - daftar notifikasi member
6. [06-dashboard.md](06-dashboard.md) - ringkasan Dashboard Admin
7. [07-system.md](07-system.md) - health, reset-state, run job

## Companion Documents

| Dokumen | Hubungan |
| --- | --- |
| [../technical-specs/_index.md](../technical-specs/_index.md) | Desain teknis (model, seam, lifecycle) |
| [../business/acceptance-criteria.md](../business/acceptance-criteria.md) | Spesifikasi teknis menelusuri ke AC |
| [../business/user-story.md](../business/user-story.md) | Menelusuri ke US |
| [../decisions/2026-11-08-api-contract.md](../decisions/2026-11-08-api-contract.md) | Keputusan TL untuk kontrak US-11/US-12 yang disepakati BE |
| [../coding-standard/_index.md](../coding-standard/_index.md) | Standar kode error/code |
| [../deployment-plan/03-initial-deployment.md](../deployment-plan/03-initial-deployment.md) | Base URL prod |
| [../deployment-plan/06-database-reset.md](../deployment-plan/06-database-reset.md) | Endpoint reset-state |

## Baseline API setelah grooming

Rincian AC aktif adalah 12 US/77 AC pada [grooming final](../decisions/2026-11-06-grooming-final.md). Kontrak 4 operasi Master Genre dan 5 operasi Management User (termasuk detail user untuk form edit) telah diputuskan TL; BE akan mengimplementasikannya sesuai kontrak; spesifikasi ada di [API Books](03-books.md), [API Authentication](02-authentication.md), dan [catatan keputusan](../decisions/2026-11-08-api-contract.md). Keputusan kontrak tidak menetapkan scope sprint. Popup reminder memanfaatkan data notifikasi/loan yang sudah ada dan tidak menambah tipe notifikasi.

## Traceability notes

AC yang tidak menambah operasi API tersendiri:
- AC-01.01 (buka form), AC-01.07 (halaman Pilih Genre), AC-09.07 (batal di pop-up Feedback), AC-09.10 (batal input denda) - kartu FE.
- AC-10.04–AC-10.08 (popup login, urutan, penutupan) - UI memakai data notifikasi/pinjaman yang sudah ada.
- AC-06.03 (job harian status otomatis) - job BE, tidak ada endpoint.

Setiap operasi di atas menyebut AC/US yang membenarkannya, atau berlabel operasional (health, reset-state, run job).

## Gate

`python3 .claude/skills/technical-spec/scripts/check_index.py --specs-dir docs/api-specs`

Skrip tidak tersedia (arsip skill tidak ada di workspace). **Tidak dijalankan.**

Operation Status Tracker memiliki 36 operasi: 27 operasi baseline awal dan 9 operasi US-11/US-12 (8 operasi hasil grooming serta `GET /admin/users/:id` untuk mengisi form Edit User). Kolom tracker menunjukkan status implementasi, bukan persetujuan kontrak. `GET /health` sudah diimplementasikan pada scaffold `TL-S1-01`; operasi lain tetap `TODO` sampai kartu terkait selesai. Catatan audit historis yang menyebut 28 operasi tidak diperbarui.
