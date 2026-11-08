Read @CLAUDE.md

# GEMINI.md - ReadOnly

Gemini memakai aturan yang sama dengan `CLAUDE.md`. File ini tidak mendefinisikan produk, stack, atau alur kerja lain.

## Yang wajib diikuti

- Produk: ReadOnly, perpustakaan internal PT. Perkasa Pilar Utama. Bukan dokumen atau stack dari proyek lain.
- Sumber kebenaran: `docs/business/`, `docs/api-specs/`, `docs/technical-specs/`, `docs/task-breakdown/`, `docs/coding-standard/`, `docs/code-review-checklist/`, `docs/deployment-plan/`.
- Stack target: Bun workspaces, ElysiaJS, SolidJS, TanStack Router, TanStack Query, PostgreSQL 16, Drizzle, Biome, bun:test, Playwright.
- Modul API: `auth`, `books`, `loans`, `notifications`, `dashboard`, `jobs`, `system`. `ratings` dan `genres` bukan modul terpisah.
- Konstanta bisnis ada di `packages/shared/src/constants.ts` (`@readonly/shared`) / spek 12, bukan di environment.
- `POST /admin/reset-state` dan `POST /admin/jobs/run` tidak terdaftar bila `APP_ENV` production (404, bukan 403).
- Teks UI persis Acceptance Criteria. Asumsi memakai `[ASSUMED Q-NN]` atau `[COPY-TBD Q-NN]`.

## Yang tidak dilakukan

- Fondasi `TL-S1-01` dan `DB-S1-01` (Drizzle schema, migrasi SQL, seeder `dev`/`qa`, konstanta bisnis) sudah tersedia; quality gates `bun run check`, `bun run typecheck`, `bun test`, `bunx biome check .`, dan `bun run build:web` dapat dijalankan. Jangan menganggap route fitur bisnis (`BE-*`), halaman UI (`FE-*`), atau Playwright E2E sudah tersedia sebelum kartu terkait dikerjakan.
- Jangan mengklaim Figma sudah sinkron.
- Jangan menambah AC ID baru.
- Peta skill FE, BE, dan `stop-slop` ada di `CLAUDE.md`.
- `.codex/config.toml` mendaftarkan `code-review-graph`. Jangan mengklaim bukti graph sebelum tool-nya mengembalikan hasil.

## Saat konteks dipadatkan

Baca ulang `CLAUDE.md` sebelum mengubah file.
