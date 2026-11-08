**Version:** 0.2  
**Date:** 2026-11-08  
**Author:** Tech Lead  
**Status:** Menunggu kartu DB  
**Phase:** Development Guide

# Database Workflow

`packages/db` masih placeholder. Scaffold menyediakan PostgreSQL lokal melalui Compose, tetapi API belum terhubung ke DB dan schema/migrasi/seed belum dibuat. Jangan menjalankan perintah di tabel target berikut sebelum kartu DB dikerjakan.

## Perintah target setelah kartu DB

| Maksud | Perintah target |
| --- | --- |
| Migrasi ke head | `bun run db:migrate` |
| Seed Admin + genre | `bun run db:seed` |
| Reset dev | `POST /admin/reset-state?seed=dev` |
| Reset QA | `POST /admin/reset-state?seed=qa` |

Compose lokal yang sudah tersedia:

```bash
docker compose -f docker/compose.yml up db -d
```

## Aturan

- Skema hanya lewat migrasi Drizzle di `packages/db` setelah kartu DB tersedia.
- Migrasi baru bersifat expand. Jangan menghapus kolom pada rilis yang sama dengan kode yang masih membacanya.
- Seed QA dan angka Dashboard harus tetap cocok dengan aritmetika di [06-database-reset.md](../deployment-plan/06-database-reset.md).
- **Reset production tidak terdaftar.**

## Cross-References

- [../coding-standard/07-database-dan-drizzle.md](../coding-standard/07-database-dan-drizzle.md)
- [../deployment-plan/06-database-reset.md](../deployment-plan/06-database-reset.md)
