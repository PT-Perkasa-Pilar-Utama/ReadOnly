**Version:** 0.1
**Date:** 2026-11-05
**Author:** Tech Lead
**Status:** Draft
**Phase:** API Specification

# System API - ReadOnly

Base: `/api/v1`

## GET /health

- **Purpose:** kesehatan dependensi (operasional).
- **Access:** publik (rincian dibatasi).
- **Output:** 200 `{ data: { api: 'ok', db: 'ok', storage: 'ok' | 'error' } }`.
- **Errors:** DB unreachable → `db: 'error'` (tidak 500).
- **SEC-13:** terdaftar di semua lingkungan, rincian dibatasi.
- **Traceability:** operasional.

## POST /admin/reset-state (non-prod saja)

- **Purpose:** reset schema + seed dev/qa untuk QA (operasional).
- **Access:** non-prod saja.
- **Behavior:** `ENABLE_RESET_API=true` + `APP_ENV ≠ production` → wipe schema, migrate head, seed sesuai `?seed=dev|qa`.
- **SEC-13:** **tidak terdaftar di production** (route diabaikan), bukan sekadar akses dibatasi.
- **Traceability:** operasional; docs `deployment-plan/06-database-reset.md`.
- **Output:** 200 `{ data: { seed, rows: { ... } } }`.
- **Errors:** 404 bila production; `internal_error` 500.

## POST /admin/jobs/run (non-prod saja)

- **Purpose:** pemicu job harian sekarang (QA), bila diputus di 15-scheduler-and-notifications (Q-31).
- **Access:** non-prod saja (mirip reset-state).
- **Input:** `{ job: 'status_overdue' | 'notifications' }`.
- **Behavior:** jalankan job sekarang (Clock diinjeksi ke waktu QA).
- **SEC-13:** tidak terdaftar di production.
- **Traceability:** AC-06.03, AC-10.01–AC-10.03.

## Cross-References

- [01-conventions.md](01-conventions.md)
- [15-scheduler-and-notifications.md](../technical-specs/15-scheduler-and-notifications.md)
- [docs/deployment-plan/06-database-reset.md](../deployment-plan/06-database-reset.md)

## Operation Status Tracker

> Semua status pada tabel ini adalah **status implementasi**. Kontrak 9 route baru untuk US-11/US-12 sudah disetujui TL dan BE; semuanya tetap `TODO` sampai implementasi pada kartu terkait selesai. `GET /health` sudah tersedia dari scaffold `TL-S1-01`.

| Operation | Method/Path | Access | Status |
| --- | --- | --- | --- |
| Register validate | POST /auth/register/validate | publik | OK |
| Register | POST /auth/register | publik | OK |
| Login | POST /auth/login | publik | OK |
| Logout | POST /auth/logout | login | OK |
| Me | GET /auth/me | login | OK |
| Genres aktif | GET /genres | publik | OK |
| Admin genre list/search | GET /admin/genres | admin | OK |
| Add genre | POST /admin/genres | admin | OK |
| Edit/status genre | PATCH /admin/genres/:id | admin | OK |
| Delete genre | DELETE /admin/genres/:id | admin | OK |
| Admin user list/search/filter | GET /admin/users | admin | OK |
| Admin user detail | GET /admin/users/:id | admin | OK |
| Add Admin user | POST /admin/users | admin | OK |
| Edit user data | PATCH /admin/users/:id | admin | OK |
| Change user status | PATCH /admin/users/:id/status | admin | OK |
| Catalog Home | GET /books | login | TODO |
| Book detail | GET /books/:id | login | TODO |
| Admin books list | GET /admin/books | admin | OK |
| Add book | POST /admin/books | admin | OK |
| Edit book | PATCH /admin/books/:id | admin | OK |
| Delete book | DELETE /admin/books/:id | admin | OK |
| Ajukan peminjaman | POST /loans | member | TODO |
| Loans me | GET /loans/me | member | TODO |
| QR token | GET /loans/:id/qr | member | TODO |
| Scan preview | POST /admin/loans/qr/preview | admin | TODO |
| QR confirm | POST /admin/loans/qr/confirm | admin | TODO |
| Daftar pinjaman Admin | GET /admin/loans | admin | OK |
| Detail peminjaman | GET /admin/loans/:id | admin | OK |
| Fine payment | POST /admin/loans/:id/fine-payment | admin | TODO |
| Ajukan pengembalian | POST /loans/:id/return | member | TODO |
| Konfirmasi pengembalian | POST /admin/loans/:id/return-confirmation | admin | TODO |
| Notifikasi | GET /notifications | member | TODO |
| Dashboard summary | GET /admin/dashboard/summary | admin | TODO |
| Health | GET /health | publik | OK |
| Reset state | POST /admin/reset-state | non-prod | TODO |
| Run job | POST /admin/jobs/run | non-prod | OK |
