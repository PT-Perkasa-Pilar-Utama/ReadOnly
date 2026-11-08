**Version:** 0.1  
**Date:** 2026-11-05  
**Author:** Tech Lead  
**Status:** Draft  
**Phase:** Coding Standard  

# Database dan Drizzle - ReadOnly

## 7.1 Skema

- Skema hanya di `packages/db`. Aplikasi tidak menulis SQL migrasi tangan di `apps/api`.
- Kolom `snake_case`. Timestamp disimpan UTC; zona bisnis Asia/Jakarta.
- CHECK `available_count >= 0`. Unique `(loan_id, type)` pada `notifications`.
- Soft-delete buku: `deleted_at`. Tolak hapus bila ada pinjaman belum `RETURNED` (Q-11, AC-05.09).

## 7.2 Migrasi

- Perintah `bun run db:migrate` dari root menyelesaikan path sendiri (deploy 03).
- Migrasi *expand then contract*. Tidak ada `down` otomatis di rilis production.
- Seed Admin membaca `ADMIN_EMAIL` / `ADMIN_PASSWORD`. Tidak hardcode password.

## 7.3 Query

- Filter `user_id = currentUser.id` di repository untuk rute member (SEC-05). Bukan hanya di handler.
- Tidak ada string interpolasi ke SQL. Drizzle parameterized.
- Paginasi server-side. Jangan `SELECT *` tanpa limit di daftar.

## Cross-References

- [../technical-specs/06-data-model.md](../technical-specs/06-data-model.md)
- [../deployment-plan/03-initial-deployment.md](../deployment-plan/03-initial-deployment.md)
