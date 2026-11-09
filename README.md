# ReadOnly

Sistem Manajemen Perpustakaan Digital Internal untuk PT. Perkasa Pilar Utama (Product ID: PRD-024). Mengelola siklus penuh operasional perpustakaan: katalog buku online, reservasi peminjaman, validasi peminjaman dan pengembalian berbasis QR Code, kalkulasi denda otomatis, notifikasi pengingat batas waktu, manajemen inventaris (Master Buku), Master Genre, dan akun pengguna.

<table>
  <tr>
      <td align="center"><a href="https://github.com/aryanibos"><img src="https://avatars.githubusercontent.com/u/93307409?v=4" width="64" alt="aryanibos"/><br/><sub><b>Arya</b></sub></a></td>
      <td align="center"><a href="https://github.com/IniRaden"><img src="https://avatars.githubusercontent.com/u/137896659?v=4" width="64" alt="IniRaden"/><br/><sub><b>Raden</b></sub></a></td>
      <td align="center"><a href="https://github.com/Derrr805"><img src="https://avatars.githubusercontent.com/u/202590901?v=4" width="64" alt="Derrr805"/><br/><sub><b>Darrel</b></sub></a></td>
      <td align="center"><a href="https://github.com/Siehan1"><img src="https://avatars.githubusercontent.com/u/113917900?v=4" width="64" alt="Siehan1"/><br/><sub><b>Sami</b></sub></a></td>
  </tr>
</table>

**Status Repositori:** Fondasi Tech Lead (`TL-S1-01` dan `DB-S1-01`) sudah selesai: Bun workspaces, API Elysia dengan `GET /api/v1/health`, shell SolidJS, kontrak shared & konstanta domain (`packages/shared/src/constants.ts`), Drizzle ORM schema 11 tabel & migrasi SQL (`packages/db`), seeder `dev` & `qa` idempoten, Clock/Storage ports, quality gates, dan Compose PostgreSQL 16 dev. Fitur bisnis pada modul API dan halaman frontend menunggu implementasi kartu `BE-*` dan `FE-*` terkait. Baseline grooming terbaru berisi 12 US dan 77 AC yang telah dipetakan ke 32 kartu di `docs/task-breakdown/`. Rundown PM menggunakan satu sprint; komitmen scope dan estimasi story point dipilih saat Sprint Planning.

---

## Quick Onboard Guide

Prasyarat: Bun 1.4.3 dan Git. Docker Desktop diperlukan untuk menjalankan PostgreSQL 16 lokal saat menjalankan migrasi dan seeder.

### 1. Clone dan Install

```bash
git clone git@github.com:PT-Perkasa-Pilar-Utama/readonly.git
cd readonly
bun install
```

### 2. Environment

Salin template nilai development lokal dari root repo. Jangan commit `.env`:

```bash
cp .env.example .env
```

### 3. PostgreSQL Lokal, Migrasi, dan Seed (`DB-S1-01`)

Nyalakan PostgreSQL 16 lokal menggunakan Docker Compose, lalu jalankan migrasi dan seeder:

```bash
docker compose -f docker/compose.yml up db -d
docker compose -f docker/compose.yml ps

# Terapkan migrasi Drizzle ke database
bun run db:migrate

# Seed data development (Admin, Member, Genre aktif, Buku contoh)
bun run db:seed

# Opsional: Seed matriks QA (12 buku, 11 pinjaman untuk pengujian Dashboard & E2E)
bun run db:seed:qa
```

### 4. Start Development Servers (Dua Terminal)

Buka dua terminal dari root repositori:

```bash
# Terminal 1: Backend API (ElysiaJS)
bun run dev

# Terminal 2: Frontend SPA (SolidJS)
bun run dev:web
```

API tersedia di `http://localhost:3000/api/v1`, web di `http://localhost:5173`, dan health check di `http://localhost:3000/api/v1/health`.

### 5. Quality Checks

```bash
bun run check          # Menjalankan typecheck + test + biome check
bun run typecheck
bun test
bunx biome check .
bun run build:web
```

---

## Stack

| Layer | Teknologi | Keterangan |
| --- | --- | --- |
| Runtime & Workspace | Bun workspaces (tanpa Node.js runtime) | Cepat, type-safe monorepo |
| Bahasa | TypeScript strict | `strict: true`, tanpa implicit `any` |
| Backend API | ElysiaJS (pada Bun) | RESTful API type-safe dengan router modular |
| Frontend | SolidJS SPA | TanStack Router + TanStack Query |
| Database & ORM | PostgreSQL 16 + Drizzle ORM | Relasional, schema-first, migrasi otomatis |
| Scheduler | In-process timer + PG Advisory Lock | Job harian 00:05 WIB (AC-06.03, AC-10.01-AC-10.03); popup login ditangani UI (AC-10.04-AC-10.08) |
| Penyimpanan Cover | Storage Port (Local Volume Docker) | Terisolasi di volume `/data/covers` (SEC-05) |
| Linter & Formatter | Biome | Standar formatting dan linting terpadu |
| Testing | bun:test + Playwright | Unit/integrasi (bun:test) dan E2E (Playwright) |
| Deployment | Docker Compose + Nginx | Manual via SSH (lihat `docs/deployment-plan/`) |

---

## Repository Structure

### Target Monorepo (Fitur ditambahkan bertahap per kartu)

```text
readonly/
├── apps/
│   ├── api/                     # ElysiaJS API (port 3000)
│   │   └── src/
│   │       ├── modules/         # auth, books, loans, notifications, dashboard, jobs, system
│   │       ├── ports/           # StoragePort, ClockPort
│   │       ├── shared/          # Middlewares, envelope response, errors
│   │       └── app.ts           # Route registration & startup
│   └── web/                     # SolidJS SPA (port 5173)
│       └── src/
│           ├── pages/           # Login, Register, PilihGenre, Home, BookDetail, Loans, Dashboard, MasterGenre, ManagementUser, etc.
│           ├── components/      # Reusable UI components & QR Scanner
│           ├── api/             # Typed API client wrapper
│           └── main.tsx         # App shell & router
├── packages/
│   ├── config/                  # Environment & runtime configuration
│   ├── db/                      # Drizzle schema, migrations (drizzle/), dev/qa seeds, drizzle.config.ts
│   └── shared/                  # Zod schemas, contract types, business constants (constants.ts)
├── docs/                        # Spesifikasi bisnis, teknis, API, standar koding
├── docker/                      # Docker Compose & Nginx configuration
├── e2e/                         # Playwright E2E test suites (ditambahkan pada kartu wiring)
└── .github/                     # PR & Issue templates
```

### Kondisi Fisik Saat Ini (`TL-S1-01` + `DB-S1-01` Selesai)

```text
readonly/
├── apps/api/                    # Elysia API, GET /api/v1/health, Clock/Storage ports
├── apps/web/                    # Shell SolidJS + TanStack Router/Query
├── packages/config/             # Prefix API (/api/v1) dan port default
├── packages/db/                 # Drizzle schema (11 tabel), migrasi SQL, client, dan seeder dev/qa
├── packages/shared/             # Envelope API, skema paginasi, konstanta bisnis, dan calculateFine
├── docker/compose.yml           # PostgreSQL 16 untuk development
├── package.json                 # Bun workspaces, db:* scripts, dan quality scripts
├── biome.json
├── tsconfig.json
└── docs/                        # Spesifikasi bisnis, teknis, API, task breakdown, dan proses
```

---

## Developer Workflow

### 1. Setup Awal
Lakukan kloning repositori, `bun install`, dan salin `.env.example` ke `.env`. Nyalakan PostgreSQL lokal dengan `docker compose -f docker/compose.yml up db -d`, lalu jalankan `bun run db:migrate` dan `bun run db:seed`.

### 2. Kerja Harian: Menjalankan Dev Server
Buka dua terminal dari root repositori:
```bash
bun run dev          # API di http://localhost:3000/api/v1
bun run dev:web      # Web di http://localhost:5173
```

### 3. Memilih Tugas
Rundown aktif menggunakan satu sprint (`docs/business/sprint-breakdown.md`). Seluruh 12 US dan 77 AC telah dipetakan ke 32 kartu di `docs/task-breakdown/`, dengan pilihan scope komitmen dan story point ditentukan saat Sprint Planning. Buat cabang sesuai format kanonik setelah kartu disepakati:
```bash
git checkout -b feat/BE-S1-02-auth-login
# Pola: <type>/<CARD-ID>-<kebab-deskripsi>
```

### 4. Testing dan Verifikasi (TDD)
Tulis pengujian unit terlebih dahulu sesuai skenario Acceptance Criteria:
```bash
bun test --watch
```
Pastikan seluruh tes lolos sebelum mengajukan code review.

### 5. Quality Gate Sebelum Buka PR
Sebelum membuka Pull Request, jalankan gate lokal berikut:
```bash
bun run check        # Menjalankan typecheck, bun test, dan biome check
bun run build:web    # Pastikan build frontend sukses
```

### 6. Membuka Pull Request
Satu kartu = satu branch = satu Pull Request.
Gunakan format commit imperatif bahasa Inggris sesuai acuan tunggal di `docs/coding-standard/11-pr-hygiene.md`:
```gitcommit
<type>(<scope>): <short summary>

Refs: <CARD-ID>
AC: <AC-XX.YY>
Tags: [ASSUMED Q-NN] (optional)
```
Isi `.github/PULL_REQUEST_TEMPLATE.md` secara lengkap termasuk checklist biner kontrol `SEC-NN`. Pull Request akan melalui lead review 3 ronde oleh Tech Lead sebelum disetujui. Perbarui status operasi di `docs/api-specs/07-system.md` dari `TODO` menjadi `OK` untuk endpoint yang diselesaikan.

---

## Menambahkan Fitur Backend Baru

Setiap fitur backend ditempatkan pada modul terkait di `apps/api/src/modules/<nama-modul>/` dengan pola arsitektur berlapis:

```text
<modul>.routes.ts       <- Definisi endpoint & binding skema validasi
<modul>.service.ts      <- Logika bisnis, validasi aturan domain, transisi status
<modul>.repository.ts   <- Query database via Drizzle ORM
<modul>.schema.ts       <- Skema validasi request / response
<modul>.test.ts         <- Unit & integration test
```

Modul API resmi yang diizinkan hanya 7: `auth`, `books`, `loans`, `notifications`, `dashboard`, `jobs`, dan `system`. *Ratings* dan *genres* merupakan sub-entitas di bawah modul `books`/`auth` dan bukan modul terpisah. Seluruh transisi status peminjaman wajib melalui `LoanService.transition(...)`.

Gunakan skill `add-api-endpoint` dan `add-drizzle-migration` saat bekerja dengan agent AI.

---

## Menambahkan Fitur Frontend Baru

Setiap fitur frontend diimplementasikan menggunakan SolidJS di `apps/web/src/`:

```text
pages/<Fitur>Page.tsx   <- Komponen halaman utama (terhubung ke TanStack Router)
components/<fitur>/     <- Komponen UI presentasional dan interaktif
api/<fitur>.ts          <- Pemanggilan typed API client (dilarang fetch langsung di komponen)
<fitur>.test.tsx        <- Pengujian komponen frontend
```

Aturan penting frontend:
1. Copy teks UI, pesan error, dan label tombol **wajib mengikuti teks Acceptance Criteria secara verbatim** (contoh: `email and Password tidak sama`, `Email Not Registered`, `mendafta`).
2. Tampilan dashboard dan halaman member harus responsif untuk desktop dan mobile browser.
3. Fitur scanner QR Admin (US-08) mengakses kamera browser dan memerlukan *Secure Context* (HTTPS pada staging/prod; localhost diizinkan untuk dev).

Gunakan skill `add-frontend-feature`, `impeccable`, dan `review-animations` saat bekerja dengan agent AI.

---

## Common Commands

```bash
# Server Pengembangan
bun run dev              # Jalankan API server (localhost:3000/api/v1)
bun run dev:web          # Jalankan Frontend SPA (localhost:5173)

# Database & Seeder (PostgreSQL lokal harus aktif)
docker compose -f docker/compose.yml up db -d
bun run db:generate      # Generate migrasi SQL dari skema Drizzle
bun run db:migrate       # Jalankan migrasi ke DATABASE_URL
bun run db:seed          # Seed data development
bun run db:seed:qa       # Seed data matriks QA (12 buku, 11 pinjaman)

# Quality Gates
bun run check            # typecheck + test + biome check
bunx biome check .
bunx biome check --write .
bun run typecheck
bun test
bun run build:web
```

---

## Peta Dokumentasi

| Dokumen | Deskripsi |
| --- | --- |
| [Product Overview](docs/init/product_overview.md) | Identitas produk, problem statement, dan solusi |
| [User Story Mentah](docs/init/user_story.md) | 12 User Story dari spreadsheet terbaru |
| [AC Mentah](docs/init/acceptance_criteria.md) | Snapshot 50 AC awal; addendum terbaru menambah 27 AC sehingga baseline kini 77 |
| [User Story](docs/business/user-story.md) | 12 User Story; scope untuk sprint PM dipilih saat Sprint Planning |
| [Acceptance Criteria Index](docs/business/acceptance-criteria.md) | Indeks baseline 77 AC; scope sprint dipilih pada Sprint Planning |
| [Acceptance Criteria Addendum](docs/business/acceptance-criteria-addendum.md) | Rincian 27 AC tambahan (AC-05.10, AC-10.04 s/d 10.08, US-11, US-12) |
| [Sprint Breakdown](docs/business/sprint-breakdown.md) | Rundown satu sprint PM; belum menjadi komitmen seluruh 77 AC |
| [Technical Specs](docs/technical-specs/_index.md) | Spesifikasi teknis arsitektur, data model, dan keamanan (01-17) |
| [API Specs](docs/api-specs/_index.md) | 36 operasi tercatat dan diselaraskan; tracker implementasi ada di `07-system.md` |
| [Task Breakdown](docs/task-breakdown/_index.md) | 32 kartu kerja (16 BE + 16 FE) dalam satu file, dikelompokkan menurut alokasi lama; scope sprint dipilih saat Planning |
| [Deployment Plan](docs/deployment-plan/_index.md) | Rencana deployment staging, production, dan database reset |
| [Coding Standard](docs/coding-standard/_index.md) | Standar koding, TypeScript, dan PR hygiene (01-11) |
| [Code Review Checklist](docs/code-review-checklist/_index.md) | Checklist review PR dan kontrol keamanan SEC-01 s/d SEC-17 |
| [Development Guide](docs/development-guide/_index.md) | Panduan alur kerja pengembangan harian |
| [Onboarding](docs/onboarding/_index.md) | Panduan orientasi untuk engineer baru |
| [Glossary](docs/GLOSSARY.md) | Glosarium istilah domain perpustakaan |
| [Final Grooming Delta](docs/decisions/2026-11-06-grooming-final.md) | Baseline terbaru, keputusan yang menggantikan asumsi lama, dan dampak scope |
| [API Contract Decision](docs/decisions/2026-11-08-api-contract.md) | Keputusan kontrak 9 operasi Master Genre & Management User |
| [PM Sprint Timeline](docs/decisions/2026-11-08-pm-sprint-timeline.md) | Rundown satu sprint, metode estimasi PM, dan klarifikasi yang masih diperlukan |
| [Foundation Build Log](docs/decisions/2026-11-05-foundation-build-log.md) | Catatan audit baseline awal 50 AC |

> **Catatan Sinkronisasi Figma:** Status sinkronisasi desain Figma berstatus `belum diverifikasi` (Q-33). Sumber copy UI tunggal yang berlaku adalah teks verbatim Acceptance Criteria.

---

## AI Agent Usage

Repositori ini menyediakan instruksi terstruktur untuk AI agent:
- [CLAUDE.md](CLAUDE.md): Panduan utama, batasan arsitektur, pemetaan skill FE/BE, dan checklist pemulihan konteks.
- [AGENTS.md](AGENTS.md): Koordinasi multi-agent dan pembagian peran tim.
- [GEMINI.md](GEMINI.md): Entry point dan aturan pengerjaan untuk Gemini CLI.
