**Version:** 0.2  
**Date:** 2026-11-08  
**Author:** Tech Lead  
**Status:** Scaffold `TL-S1-01` tersedia  
**Phase:** Development Guide

# Testing

Quality checks yang sudah tersedia dari root repo:

| Gate | Perintah |
| --- | --- |
| Format + lint | `bunx biome check .` |
| Tipe | `bun run typecheck` |
| Unit + integrasi scaffold | `bun test` |
| Build web | `bun run build:web` |

E2E Playwright (`bun run e2e`) belum tersedia sampai kartu wiring menambahkan dependency, konfigurasi, dan harness.

## Wajib pada perubahan denda atau stok

- `calculateFine` untuk late days 0, 1, 4, 5, 6.
- Conditional decrement: dua konfirmasi stok terakhir, satu 409.
- E2E wiring memakai seed QA, bukan data manual yang tidak direproduksi.

Clock port diinjeksi. Jangan `sleep` sampai jam 00:05. Job non-prod `POST /admin/jobs/run` menunggu kartu jobs.

## Cross-References

- [../coding-standard/08-tests.md](../coding-standard/08-tests.md)
- [../task-breakdown/sprint-1.md](../task-breakdown/sprint-1.md)
