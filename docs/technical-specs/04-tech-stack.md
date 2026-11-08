**Version:** 0.1
**Date:** 2026-11-05
**Author:** Tech Lead
**Status:** Draft
**Phase:** Technical Specification

# Technical Stack - ReadOnly

## Pilihan teknologi

| Concern | Component | Technology | Justification |
| --- | --- | --- | --- |
| Package manager / runtime | Bun workspaces | Bun | Monorepo, workspace, dan runtime cepat |
| API framework | ElysiaJS | Elysia (Bun) | Ringan, type-safe, cocok untuk API REST kecil-menengah |
| SPA | SolidJS + TanStack Router + TanStack Query | SolidJS | Performa tinggi, router data-driven, query caching |
| Database | PostgreSQL 16 | PostgreSQL | Relasional, advisory lock untuk idempotensi job |
| ORM | Drizzle ORM | Drizzle | TypeScript-first, schema-to-SQL dapat diprediksi |
| Validasi | packages/shared | zod (atau skema setara) | Satu sumber kebenaran validasi untuk BE + FE client |
| Strict typing | TypeScript | TypeScript strict | P-06 wajib strict |
| Linter / formatter | Biome | Biome | Satu tool untuk lint + format; diatur TL-S1-01 |
| Test unit | bun:test | bun:test | Tidak perlu dependency tambahan |
| Test e2e | Playwright | Playwright | Standart untuk browser QA, mendukung kamera fake Chromium |
| Container | Docker Compose + Nginx | Docker | P-16: satu VPS, reverse proxy TLS |
| QR generator | pustaka QR | `<pin at scaffold>` | Pustaka QR generator (mis. qrcode) di `apps/web` |
| QR scanner | pustaka scanner | `<pin at scaffold>` | Webcam QR scanner (mis. html5-qrcode) di `apps/web` |
| Scheduler | in-process | Bun + advisory lock | P-14: job harian satu proses, tanpa dependensi OS cron |
| Hash password | bcrypt | bcrypt | `bcrypt` di `apps/api` (SEC-01) |

## Versi

Pin yang sudah digunakan scaffold dicatat eksak di `package.json` workspace dan `bun.lock`:

| Package | Versi |
| --- | --- |
| Bun | 1.4.3 |
| Elysia | 1.4.31 |
| SolidJS | 1.9.18 |
| TanStack Solid Router | 1.170.43 |
| TanStack Solid Query | 5.105.3 |
| Vite | 8.3.6 |
| vite-plugin-solid | 2.11.15 |
| Zod | 4.6.7 |
| TypeScript | 7.0.2 |
| Biome | 2.6.6 |
| PostgreSQL image | 16.15 |

Drizzle, Playwright, bcrypt, dan pustaka QR belum ditambahkan karena schema DB, alur produk, dan E2E berada di kartu berikutnya. P-18 tetap berlaku: versi dependency baru harus dipin eksak pada kartu pemiliknya.

## What we deliberately do NOT use

| Item | Alasan |
| --- | --- |
| Transcoding gambar cover (Sharp dsb.) | AC hanya memvalidasi format/ukuran; Q-13 |
| Nikala UI | Pustaka UI belum diputus; Q-33 |
| Email / push notification / WebSocket | Out of scope v1; Q-29 |
| Redis / job worker terpisah | Job in-process idempoten cukup untuk skala Q-32; tambah nanti bila ada bukti |
| Payment gateway | Pembayaran tunai di tempat; Q-23 |
| SSO / OIDC | Out of scope; Q-04 |
| Native app | Web responsif; Q-01 |

## Kebijakan pinning versi

- Semua dependency pinned ke versi eksak di `package.json` dan `bun.lock`.
- Pin diimplementasikan kartu TL-S1-01; dokumennya: `package.json` masing-masing workspace.

## Cross-References

- [01-overview.md](01-overview.md)
- [05-module-definitions.md](05-module-definitions.md)
- [docs/coding-standard/_index.md](../coding-standard/_index.md)

## Open Follow-ups

Q-18 (pustaka QR generator/scanner yang dipilih), Q-31 (pustaka scheduler bila pindah worker), Q-33 (pustaka UI).
