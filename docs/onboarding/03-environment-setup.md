**Version:** 0.2  
**Date:** 2026-11-08  
**Author:** Tech Lead  
**Status:** Scaffold `TL-S1-01` tersedia  
**Phase:** Onboarding

# Environment Setup

Ikuti [development-guide/01-local-setup.md](../development-guide/01-local-setup.md).

Ringkas:

1. Prasyarat: Bun 1.4.3; Docker Compose opsional untuk PostgreSQL lokal.
2. Salin `.env.example` di root menjadi `.env`; jangan commit file tersebut.
3. Jalankan `bun install`.
4. Jalankan `bun run dev` dari root untuk API dan web sekaligus. Untuk proses terpisah, gunakan `bun run dev:api` dan `bun run dev:web`.
5. Untuk menyalakan PostgreSQL lokal: `docker compose -f docker/compose.yml up db -d`.

API scaffold belum memakai database. `bun run db:migrate`, `bun run db:seed`, dan kredensial seed belum tersedia sampai kartu DB selesai.

Jangan menaruh secret di chat, tiket, atau commit.

## Cross-References

- [../technical-specs/11-environment-configuration.md](../technical-specs/11-environment-configuration.md)
