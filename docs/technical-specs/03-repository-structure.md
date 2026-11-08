**Version:** 0.1
**Date:** 2026-11-05
**Author:** Tech Lead
**Status:** Draft
**Phase:** Technical Specification

# Repository Structure - ReadOnly

Struktur monorepo Bun workspaces (P-06). Scaffold minimal kartu `TL-S1-01` sudah dibuat; pohon target mencakup struktur fitur yang ditambahkan bertahap pada kartu terkait.

## Pohon direktori

```
readonly/
├── apps/
│   ├── api/              # ElysiaJS API pada Bun
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/      # register, login, logout, me, Management User
│   │   │   │   ├── books/     # CRUD buku dan Master Genre, upload cover, search, filter
│   │   │   │   ├── loans/     # ajukan, loans/me, QR token, confirm, return, admin list
│   │   │   │   ├── notifications/  # daftar notifikasi member dan data popup reminder
│   │   │   │   ├── dashboard/ # ringkasan 6 metrik
│   │   │   │   ├── jobs/      # scheduler harian status terlambat + notifikasi
│   │   │   │   └── system/    # /health, /admin/reset-state (non-prod)
│   │   │   ├── ports/         # Storage port, Clock port, camera port
│   │   │   ├── shared/        # envelope error, routes, middleware
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── bunfig.toml
│   └── web/              # SolidJS SPA (TanStack Router + TanStack Query)
│       ├── src/
│       │   ├── pages/         # satu folder per halaman (5.5)
│       │   ├── components/
│       │   ├── routes.tsx
│       │   └── api/           # klien API + pemetaan error
│       └── package.json
├── packages/
│   ├── shared/         # skema validasi bersama, konstanta bisnis, tipe
│   └── db/             # Drizzle schema + migrasi
├── docker/             # Dockerfile, compose, nginx
├── e2e/                # Playwright
├── package.json        # root: bun workspaces
├── biome.json
└── .github/
```

## Isi scaffold saat ini

- `apps/api`: Elysia app, `GET /api/v1/health`, error envelope, serta port Clock dan Storage. Health check belum terhubung ke adapter DB/storage sehingga keduanya melaporkan `error` secara default.
- `apps/web`: shell SolidJS kosong yang sudah memakai TanStack Router dan TanStack Query; Vite mem-proxy `/api` ke API.
- `packages/config`: prefix API dan port default.
- `packages/shared`: skema envelope API dan paginasi; konstanta bisnis ditambahkan sesuai kartu domain, bukan pada scaffold.
- `packages/db`: workspace placeholder. Schema Drizzle, migrasi, dan seed menunggu kartu DB.
- `docker/compose.yml`: PostgreSQL 16 untuk development lokal.

## Modul API: keputusan module design

**`ratings` menjadi bagian dari `books`, bukan modul sendiri (deletion test).** Pertimbangkan: hapus modul ratings → masih ada entitas ratings dan fungsi rata-rata rating yang bisa dipindahkan ke `books` (sebuah buku *memiliki* rating). Tidak ada batas kepercayaan terpisah, tidak ada sekuestrasi eksternal. Hapus `ratings` sebagai modul; pertahankan entitas `ratings` dalam skema `books`.

**`genres` bagian dari `books` (deletion test).** Genre dikelola melalui modul `books`, termasuk CRUD dan status Master Genre sesuai US-11; dropdown genre aktif dipakai oleh `auth` dan `books`. `genres` tetap bukan modul API tersendiri.

## Struktur apps/web per halaman (5.5)

| Halaman | Folder |
| --- | --- |
| Login | `pages/Login` |
| Register step 1 | `pages/RegisterStep1` |
| Pilih Genre | `pages/PilihGenre` |
| Home | `pages/Home` |
| Detail Buku | `pages/BookDetail` |
| Pinjaman | `pages/Loans` |
| Dashboard | `pages/Dashboard` |
| Master Buku | `pages/MasterBooks` |
| Master Genre | `pages/MasterGenres` |
| Management User | `pages/ManagementUsers` |
| Manajemen Peminjaman | `pages/LoanManagement` |

## Tempat konstanta bisnis

Konstanta (7 hari, 3 hari, Rp 2.000, ambang 1–4 dan 5 hari, max 5 MiB) disimpan di `packages/shared/constants.ts`, bukan di environment. Modul lain mengimpor dari sana. Ini mematuhi invarian: konstanta bisnis tidak boleh sebagai env var (P-14, Q-31).

## Cross-References

- [04-tech-stack.md](04-tech-stack.md)
- [05-module-definitions.md](05-module-definitions.md)
- [06-data-model.md](06-data-model.md)
- [docs/api-specs/_index.md](../api-specs/_index.md)

## Open Follow-ups

Q-33 (pustaka UI menentukan struktur komponen `pages`), Q-03 (struktur modul tambahan bila out-of-scope berubah).
