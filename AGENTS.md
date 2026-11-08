Read @CLAUDE.md

# AGENTS.md - ReadOnly Multi-Agent Coordination

Aturan lengkap ada di `CLAUDE.md`. Hasil grooming terbaru ada di `docs/decisions/2026-11-06-grooming-final.md`. File ini hanya mengatur koordinasi antar agent di repositori ReadOnly.

## Scope

ReadOnly adalah sistem peminjaman buku internal PT. Perkasa Pilar Utama (PRD-024). Fondasi Tech Lead (`TL-S1-01` scaffold dan `DB-S1-01` Drizzle schema, migrasi SQL, seeder `dev`/`qa`, serta konstanta bisnis di `@readonly/shared`) sudah tersedia; implementasi fitur bisnis menunggu kartu `BE-*` dan `FE-*` masing-masing.

## Peran

| Peran | Yang dikerjakan |
| --- | --- |
| TL | Spek, arsitektur, skema, scaffold `TL-S1-01` (selesai), kartu `DB-S1-01` (selesai), review akhir PR |
| BE1 | API ElysiaJS (`BE-S1-01` s/d `BE-S3-05`): auth, books, loans, jobs, notifications, dashboard |
| FE1 | SolidJS (`FE-S1-01` s/d `FE-S3-05`): halaman, komponen, scanner kamera QR |

Nama orang tidak dicatat di dokumen teknis (P-07).

## Invarian

1. Baseline terbaru berisi 12 US dan 77 AC dari spreadsheet grooming final dan telah dipetakan ke 32 kartu di `docs/task-breakdown/`. Jangan mengarang AC; sinkronkan hanya ID dan teks yang tercantum pada sumber.
2. Figma berstatus **belum diverifikasi** (Q-33). Copy UI mengikuti Acceptance Criteria secara verbatim.
3. Satu kartu = satu branch = satu PR. Pola branch: `<type>/<CARD-ID>-<kebab-deskripsi>`.
4. Commands yang sudah tersedia: `bun install`, `bun run dev`, `bun run dev:web`, `bun run build:web`, `bun run db:generate`, `bun run db:migrate`, `bun run db:seed`, `bun run db:seed:qa`, `bun run typecheck`, `bun test`, `bunx biome check .`, dan `bun run check`.
5. PR milik TL direview BE1 atau FE1 sesuai area kartu (`[ASSUMED Q-37]`).
6. Peta skill FE, BE, dan prosa ada di bagian Local Skills and Commands pada `CLAUDE.md`.
7. `.codex/config.toml` mendaftarkan `code-review-graph`. Klaim bukti graph hanya jika tool-nya mengembalikan hasil.
8. Rundown PM menetapkan satu sprint. Jadwal ada di `docs/business/sprint-breakdown.md`; komitmen scope dipilih saat Sprint Planning.

## Saat konteks dipadatkan

Baca ulang `CLAUDE.md` sebelum mengubah file.
