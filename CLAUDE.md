# AI Agent Instructions: ReadOnly

> **Critical:** Aturan ini berlaku untuk setiap tugas. Jika konteks mengalami pemadatan (compaction), baca ulang file ini sebelum melanjutkan. Jangan tandai pekerjaan selesai sebelum verifikasi yang relevan lulus. Fondasi Tech Lead (`TL-S1-01` scaffold dan `DB-S1-01` Drizzle schema, migrasi SQL, seeder `dev`/`qa`, serta konstanta bisnis di `@readonly/shared`) sudah tersedia; route bisnis modul API dan halaman produk frontend menunggu implementasi kartu `BE-*` dan `FE-*` masing-masing.

> **Source of Truth:** Ruang lingkup terbaru adalah 12 US dan 77 AC dari spreadsheet grooming di `docs/decisions/2026-11-06-grooming-final.md`; rincian 27 AC terbaru ada di `docs/business/acceptance-criteria-addendum.md`. Seluruh 77 AC telah dipetakan ke 32 kartu kerja di `docs/task-breakdown/`. PM menetapkan cadence satu sprint pada `docs/decisions/2026-11-08-pm-sprint-timeline.md`; komitmen scope dan estimasi story point dipilih saat Sprint Planning. Kontrak 36 operasi API (termasuk 9 operasi US-11/US-12) telah diselaraskan di `docs/api-specs/` dan `docs/decisions/2026-11-08-api-contract.md`. Status `TODO` pada tracker di `docs/api-specs/07-system.md` berarti belum diimplementasikan, bukan belum disepakati. Arsitektur, model data, dan keamanan berada di `docs/technical-specs/`; standar implementasi di `docs/coding-standard/`; checklist review di `docs/code-review-checklist/`; panduan operasional di `docs/development-guide/`, `docs/deployment-plan/`, dan `docs/onboarding/`.

## Project Overview

**ReadOnly** adalah platform digital manajemen peminjaman buku perpustakaan internal untuk PT. Perkasa Pilar Utama (Product ID: PRD-024). Repositori sudah memiliki **fondasi lengkap dari kartu `TL-S1-01` dan `DB-S1-01`**: workspace Bun, API Elysia `/api/v1/health`, shell SolidJS, paket `@readonly/shared` (envelope, paginasi, konstanta domain, `calculateFine`), `@readonly/config`, `@readonly/db` (Drizzle schema 11 tabel, migrasi SQL, seeder `dev` dan `qa`), port Clock/Storage, quality gates, dan Compose PostgreSQL 16 dev. Implementasi fitur bisnis menunggu kartu `BE-*` dan `FE-*` masing-masing.

| Layer | Teknologi | Keterangan |
| --- | --- | --- |
| Runtime & Workspace | Bun workspaces monorepo | Monorepo cepat dan type-safe |
| Bahasa | TypeScript strict | `strict: true`, no implicit `any`, no unsafe casts |
| Frontend | SolidJS SPA | TanStack Router + TanStack Query |
| Backend API | ElysiaJS (pada Bun) | RESTful API type-safe |
| Database & ORM | PostgreSQL 16 + Drizzle ORM | Relasional, 11 tabel di `packages/db`, advisory lock untuk scheduler |
| Scheduler | In-process timer + PostgreSQL advisory lock | Job harian 00:05 WIB (AC-06.03, AC-10.01-AC-10.03); popup login AC-10.04-AC-10.08 memakai payload `login_popups` dari `GET /notifications` |
| Penyimpanan Cover | Storage Port (Local Volume) | Terisolasi di volume Docker `/data/covers` (SEC-05) |
| Linter & Formatter | Biome | Standar formatting dan linting terpadu |
| Testing | bun:test + Playwright | Unit, integrasi, dan E2E testing |

## Team and Work Model

Tim pengembang internal terdiri dari 3 peran engineering (ditambah QA untuk pengujian SIT/test script). Nama PIC dicantumkan hanya pada kolom Owner task breakdown; dokumen teknis lain menggunakan peran (P-07).

| Peran | Fokus Utama | Tanggung Jawab Dominan |
| --- | --- | --- |
| **Tech Lead (TL)** | Arsitektur, DB, Scaffold, Review | Pemilik kartu `TL-S1-01` (selesai), `DB-S1-01` (selesai), dan reviewer akhir seluruh PR |
| **Backend Engineer (BE1)** | API, Auth, Books, Loans, Jobs | Pemilik kartu backend (`BE-S1-01` s/d `BE-S3-05`): auth, books, loans, scheduler, notifications, dashboard |
| **Frontend Engineer (FE1)** | UI, SPA Pages, Kamera QR | Pemilik kartu frontend (`FE-S1-01` s/d `FE-S3-05`): komponen UI, halaman SolidJS, scanner kamera browser |

1. Kerjakan hanya kartu yang telah dialokasikan pada `docs/task-breakdown/`. Developer tidak mengambil backlog di luar kartu yang ditugaskan.
2. Backend dan Frontend dapat bekerja paralel berlandaskan kontrak API di `docs/api-specs/`.
3. Satu kartu = satu branch = satu Pull Request. Estimasi PM memakai story point dan konversi jam di timeline; angka `Xd` pada kartu adalah bobot relatif.
4. Review PR menerapkan metode lead-review 3 ronde oleh TL. Khusus PR untuk kartu milik TL, reviewer adalah BE1 atau FE1 sesuai area kartu (`[ASSUMED Q-37]`).
5. Kapasitas sprint mengikuti formula PM: 5 hari kerja x 5,5 jam efektif x jumlah developer.

## Local Skills and Commands

Skill ada di `.claude/skills/<nama>/SKILL.md`. Command ada di `.claude/commands/<nama>.md`. Baca file yang cocok **sebelum** mengubah kode. Skill tidak boleh mengalahkan `CLAUDE.md` atau dokumen di `docs/`.

Seluruh skill proyek di `.claude/skills/` dan command di `.claude/commands/` telah disesuaikan untuk stack ReadOnly (ElysiaJS, SolidJS, Drizzle ORM, `bun run check`). Perintah yang sudah tersedia di root: `bun run dev`, `bun run dev:web`, `bun run build:web`, `bun run db:generate`, `bun run db:migrate`, `bun run db:seed`, `bun run db:seed:qa`, `bun run typecheck`, `bun test`, `bunx biome check .`, dan `bun run check`.

### Backend (BE1, kartu `BE-*` dan `DB-*`)

| Tugas | Pakai dulu | Jangan pakai untuk ini |
| --- | --- | --- |
| Endpoint API baru | `add-api-endpoint` | Skill UI |
| Ubah skema / migrasi | `add-drizzle-migration` | Edit SQL produksi manual |
| Kontrak bersama BE dan FE | `add-shared-schema` | Duplikasi literal di `apps/web` |
| Jejak status pinjaman | `add-audit-log` | Log `console` sebagai pengganti `loan_events` |

Modul API tetap `auth`, `books`, `loans`, `notifications`, `dashboard`, `jobs`, `system`. Transisi status hanya lewat `LoanService.transition`. Stok hanya berubah di transaksi yang sama dengan status.

### Frontend (FE1, kartu `FE-*`)

| Tugas | Pakai dulu | Catatan |
| --- | --- | --- |
| Halaman atau alur produk | `add-frontend-feature` | SolidJS di `apps/web/src/pages/`, bukan React. Data lewat `apps/web/src/api/`. |
| Rapikan UI yang sudah ada | `impeccable` | Untuk halaman aplikasi, form, state kosong, dan copy. |
| Detail gerak dan polish | `emil-design-eng`, lalu `review-animations` | Jangan menambah library UI selama Q-33 masih terbuka. |
| Landing atau presentasi visual | `design-taste-frontend`, `high-end-visual-design`, `redesign-existing-projects` | Bukan skill utama untuk Dashboard, Master Buku, atau tabel pinjaman. |

`add-simpan-kirim-form` hanya jika kartu memang meminta draft lalu kirim. Form register, login, dan pengembalian ReadOnly bukan form simpan-kirim.

Copy yang terlihat pengguna harus persis AC. `stop-slop` dipakai untuk prosa dokumen, bukan untuk mengubah string AC.

### Bersama (TL, BE1, FE1)

| Tugas | Command | Skill |
| --- | --- | --- |
| Mulai tugas | `.claude/commands/start-task.md` | `codebase-navigation` |
| Telusuri bug | `.claude/commands/debug-issue.md` | `codebase-navigation` |
| Refactor tanpa ubah perilaku | `.claude/commands/refactor-safely.md` | `refactor-large-file` |
| Review sebelum PR | `.claude/commands/review-changes.md` | `developer-pre-pr-checklist` |
| Commit atau push, hanya jika diminta | `.claude/commands/commit-and-push.md` | `git-commit` |
| Tulis atau rapikan prosa | - | `stop-slop` |
| Bukti E2E satu alur AC | - | `add-playwright-mcp-flow` |

Fence commit tetap hanya di `docs/coding-standard/11-pr-hygiene.md`. Checklist keamanan tetap `docs/code-review-checklist/04-security.md`.

### Codex dan graph

`.codex/config.toml` mendaftarkan MCP `code-review-graph` (`uvx code-review-graph serve`). Pakai hanya setelah server terhubung dan sebuah tool graph mengembalikan hasil. Jika tidak terhubung, pakai `rg` dan baca file. Jangan mengarang bukti graph.

## Repository Layout

Struktur monorepo (`TL-S1-01` + `DB-S1-01` selesai) dan target modul yang didokumentasikan di `docs/technical-specs/03-repository-structure.md`:

```text
readonly/
|-- apps/
|   |-- api/                 # ElysiaJS API pada Bun (modules: auth, books, loans, notifications, dashboard, jobs, system)
|   `-- web/                 # SolidJS SPA (pages: Login, RegisterStep1, PilihGenre, Home, BookDetail, Loans, Dashboard, MasterBooks, MasterGenres, ManagementUsers, LoanManagement)
|-- packages/
|   |-- config/              # Konfigurasi runtime terisolasi
|   |-- db/                  # Drizzle ORM schema (11 tabel), migrasi SQL (drizzle/), dan seeder (src/seeds/)
|   `-- shared/              # Skema Zod bersama (api.ts), konstanta bisnis & calculateFine (constants.ts)
|-- docs/                    # Dokumentasi bisnis, teknis, API, task breakdown, deployment, dan proses
|-- docker/                  # Docker Compose, Dockerfile, Nginx config
|-- e2e/                     # Pengujian Playwright end-to-end (ditambahkan kartu wiring)
`-- .github/                 # Issue templates dan PULL_REQUEST_TEMPLATE.md
```

## Architecture Laws

### Boundaries & Modul

- Modul API di `apps/api/src/modules/` hanya terdiri dari: `auth`, `books`, `loans`, `notifications`, `dashboard`, `jobs`, dan `system`.
- **`ratings` dan `genres` BUKAN modul terpisah.** Rating dan Master Genre dimiliki modul yang sudah ada: ratings di `books`, pengelolaan genre di `books`, dan pilihan genre dipakai oleh `auth` / `books`.
- Arsitektur berlapis: Route / Handler tipis -> Service (aturan bisnis) -> Repository (query Drizzle).
- Handler bertugas memvalidasi skema input, memanggil satu service, dan membungkus hasil ke dalam standar envelope. Handler dilarang menjalankan query SQL langsung.
- Halaman frontend SolidJS dilarang memanggil `fetch` langsung; seluruh panggilan HTTP melalui API client di `apps/web/src/api/`.
- Konstanta bisnis (masa pinjam 7 hari, pengingat 3 hari, denda flat Rp 2.000 untuk 1-4 hari, ambang input denda >= 5 hari, batas cover 5 MiB) **wajib diimpor dari `@readonly/shared` (`packages/shared/src/constants.ts`)**. Dilarang menjadikannya environment variable (P-14, Q-31).

### Scope & Domain Rules

- Teks UI, pesan inline validasi, dan pesan error wajib mengikuti Acceptance Criteria terbaru secara verbatim. Termasuk copy login nonaktif `Akun Anda tidak aktif. Silakan hubungi Admin Perpus.` dan teks Master Genre/User pada addendum.
- Identifier kode, nama fungsi, nama tabel/kolom database, branch, commit, dan error code menggunakan bahasa Inggris.
- Peran pengguna hanya dua: `member` dan `admin`.
- Status peminjaman mengikuti 6 status kanonik: `PENDING`, `BORROWED`, `OVERDUE`, `RETURN_PENDING`, `FINE_PENDING`, `RETURNED`. Seluruh transisi status wajib melalui `LoanService.transition(...)` (spek 12).
- Pemotongan stok buku (`available_count`) terjadi secara atomik saat Admin menyetujui peminjaman via QR Code (AC-08.03), bukan saat pengajuan pinjam (spek 13).

### Security & Operational Safety

- Endpoint operasional `POST /admin/reset-state` dan `POST /admin/jobs/run` **TIDAK TERDAFTAR di production** (SEC-13). Handler tidak diregistrasikan ke router bila `APP_ENV === 'production'` sehingga menghasilkan HTTP 404.
- Akses kamera browser untuk scanner QR Admin (US-08) mewajibkan *Secure Context* (HTTPS pada Staging dan Production; `localhost` adalah pengecualian untuk dev, SEC-17, Q-01).
- Token QR dihasilkan dengan CSPRNG 128-bit, disimpan dalam bentuk SHA-256 hash, berlaku sekali pakai, dan tidak dicatat di log (SEC-12).
- Tidak ada rahasia (`DATABASE_URL`, `SESS_SECRET`, `ADMIN_PASSWORD`) yang di-commit ke repositori atau dicetak ke log aplikasi (SEC-14).
- PII tidak boleh masuk log atau Dashboard. Nomor ponsel boleh tampil pada halaman Management User Admin sesuai AC-12.01; akses data user tetap dibatasi ke kebutuhan AC-12.05 dan SEC-15.

## Testing and Verification

Quality gate dan perintah DB yang tersedia saat ini:

```powershell
bun run check                # Menjalankan typecheck + test + biome check
bunx biome check .           # Format dan linting
bun run typecheck            # Pemeriksaan tipe TypeScript strict
bun test                     # Unit dan integration tests
bun run build:web            # Build shell frontend
bun run db:generate          # Generate migrasi SQL Drizzle
bun run db:migrate           # Jalankan migrasi ke DATABASE_URL
bun run db:seed              # Jalankan seeder dev
bun run db:seed:qa           # Jalankan seeder matriks QA
```

Playwright E2E dijalankan setelah kartu wiring menambahkan harness dan perintahnya.

- Tes unit denda wajib mencakup batas late days 0, 1, 4, 5, dan 6 (nilai: 0, 2000, 2000, null, null).
- Tes yang bergantung pada waktu harus menginjeksi Clock port, dilarang memanggil `Date.now()` langsung.
- Harness pengujian E2E non-produksi menggunakan seed QA (`?seed=qa` / `seedQa`) dengan angka harapan dashboard: `totalBooks: 12`, `totalAvailability: 8`, `borrowedCount: 2`, `overdueCount: 6`, `returnedCount: 2`, `pieChart: { onTime: 1, late: 1 }` (deploy 06).

## Development & Git Workflow

- Satu kartu = satu branch: `<type>/<CARD-ID>-<kebab-title>` (contoh: `feat/BE-S1-02-auth-login`, `feat/FE-S2-03-dashboard`).
- Commit message mengikuti format imperatif bahasa Inggris sesuai satu-satunya acuan di `docs/coding-standard/11-pr-hygiene.md`:

```gitcommit
<type>(<scope>): <short summary>

Refs: <CARD-ID>
AC: <AC-XX.YY>
Tags: [ASSUMED Q-NN] (optional)
```

- Isi `.github/PULL_REQUEST_TEMPLATE.md` secara lengkap termasuk checklist biner kontrol `SEC-NN`.
- Update Operation Status Tracker di `docs/api-specs/07-system.md` dari `TODO` ke `OK` hanya untuk operasi yang diselesaikan pada kartu terkait.
- Tidak ada `git add -A`, `git add .`, atau force push. Pastikan `.env`, dump database, dan file storage tidak masuk ke staging git.

## Context Recovery Checklist

Jika konteks mengalami pemadatan (compaction), pastikan kembali:

- [ ] Proyek ini adalah **ReadOnly** (perpustakaan internal PT. Perkasa Pilar Utama), bukan proyek lain.
- [ ] Fondasi `TL-S1-01` (scaffold) dan `DB-S1-01` (`packages/db` Drizzle schema 11 tabel, migrasi, seeder `dev`/`qa`, serta `packages/shared/src/constants.ts`) sudah selesai; fitur bisnis modul API dan UI menunggu kartu `BE-*` dan `FE-*`.
- [ ] Baseline terbaru adalah 12 US dan 77 AC yang telah dipetakan ke 32 kartu di `docs/task-breakdown/`; cadence PM satu sprint tercatat di `docs/decisions/2026-11-08-pm-sprint-timeline.md`.
- [ ] Status Figma adalah **belum diverifikasi** (Q-33); sumber copy UI utama adalah teks Acceptance Criteria verbatim.
- [ ] Endpoint `POST /admin/reset-state` dan `POST /admin/jobs/run` **tidak terdaftar** di production (HTTP 404).
- [ ] Konstanta bisnis berada di `packages/shared/src/constants.ts` (`@readonly/shared`) / spek 12, bukan di environment variable.
- [ ] Gaya penulisan: bahasa Indonesia untuk dokumentasi/UI, bahasa Inggris untuk identifier kode/commit.
- [ ] Format linting: nol em-dash, nol plain TBD/FIXME (gunakan tag `[ASSUMED Q-NN]` atau `[COPY-TBD Q-NN]`).
- [ ] Skill yang dipakai sesuai tabel Local Skills: BE ke skill API/DB, FE ke skill SolidJS/UI, prosa ke `stop-slop`.
