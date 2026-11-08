**Version:** 0.1  
**Date:** 2026-11-05  
**Author:** Tech Lead  
**Status:** Draft  
**Phase:** Coding Standard  

# Tests - ReadOnly

`bun test` sudah tersedia pada scaffold. Integrasi DB, E2E Playwright, dan tes fitur domain menunggu kartu terkait.

## 8.1 Piramida

| Jenis | Tool | Wajib untuk |
| --- | --- | --- |
| Unit | `bun:test` | `calculateFine`, transisi status, decrement stok, hash QR |
| Integrasi API | `bun:test` + DB test | register, login, CRUD buku, QR confirm, denda |
| E2E | Playwright | kartu wiring per sprint |

## 8.2 Clock dan waktu

- Tes tidak memanggil `Date.now()` di subject. Clock port diinjeksi.
- Seed QA memakai tanggal relatif. Job diuji lewat `POST /admin/jobs/run` (non-prod), bukan sleep sampai 00:05.

## 8.3 Fine bounds

Tes unit `calculateFine` wajib mencakup `lateDays` 0, 1, 4, 5, 6. Nilai harapan: 0, 2000, 2000, null, null. Sumber konstanta hanya spek 12.

## 8.4 E2E

- Harness reset-state memakai seed `qa` (deploy 06).
- Dua konteks browser untuk alur Member lalu Admin (FE-S2-04).
- Kamera: Playwright fake device; jangan andalkan webcam fisik CI.
- Pesan UI diassert persis string AC.

## 8.5 Yang tidak diuji sebagai API

AC murni UI atau job (lihat api-specs `_index` exclusions) tetap diuji e2e atau tes job, bukan dibuatkan endpoint baru.

## Cross-References

- [../deployment-plan/06-database-reset.md](../deployment-plan/06-database-reset.md)
- [../task-breakdown/sprint-1.md](../task-breakdown/sprint-1.md)
