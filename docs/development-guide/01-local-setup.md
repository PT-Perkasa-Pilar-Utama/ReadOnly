**Version:** 0.2  
**Date:** 2026-11-08  
**Author:** Tech Lead  
**Status:** Scaffold `TL-S1-01` tersedia  
**Phase:** Development Guide

# Local Setup

Scaffold minimal sudah tersedia. Fitur bisnis, koneksi DB/storage, schema Drizzle, migrasi, dan seed belum termasuk; ikuti kartu terkait sebelum menjalankan perintah DB.

## Prasyarat

- Bun 1.4.3
- Docker Compose (opsional, untuk PostgreSQL 16 lokal)
- Git

## Langkah

1. Clone repo.
2. Salin `.env.example` di root menjadi `.env`. Jangan commit `.env`.
3. Jalankan `bun install` dari root repo.
4. Opsional: jalankan `docker compose -f docker/compose.yml up db -d` untuk PostgreSQL lokal.
5. Dari root repo, jalankan `bun run dev` untuk menyalakan API dan web sekaligus. Jika ingin terpisah, gunakan `bun run dev:api` dan `bun run dev:web` di dua terminal.

API dan web scaffold dapat berjalan tanpa database. Sampai adapter DB/storage ditambahkan, health check mengembalikan HTTP 200 dengan `db: "error"` dan `storage: "error"` secara default.

## Perintah yang belum tersedia

`bun run db:migrate`, `bun run db:seed`, dan `bun run db:studio` belum disediakan. Kartu DB akan menambahkan schema, migrasi, seeder, serta perintah database dari root repo.

## Kamera di development

`localhost` adalah secure context. Scanner QR Admin bisa diuji tanpa HTTPS (SEC-17, Q-01). Fitur scanner belum dibuat pada scaffold. Staging dan production wajib HTTPS.

## Cross-References

- [../onboarding/03-environment-setup.md](../onboarding/03-environment-setup.md)
- [02-running-the-app.md](02-running-the-app.md)
