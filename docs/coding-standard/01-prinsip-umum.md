**Version:** 0.1  
**Date:** 2026-11-05  
**Author:** Tech Lead  
**Status:** Draft  
**Phase:** Coding Standard  

# Prinsip Umum - ReadOnly

## 1.1 Prinsip

- **Contract-first:** kontrak API (api-specs) dan skema validasi (`packages/shared`) didiskusikan sebelum implementasi kartu.
- **TypeScript strict:** `strict: true` di `tsconfig.json` semua workspace. Tidak ada `any` implisit.
- **Satu sumber kebenaran:** konstanta bisnis (7 hari, 3 hari, Rp 2.000, ambang 1–4 dan 5 hari, 5 MiB) hanya di `packages/shared/constants.ts`. Tidak boleh sebagai environment variable (P-14, Q-31).
- **Teks UI persis AC:** pesan error dan label UI ditulis persis seperti di Acceptance Criteria (P-06). Tidak diterjemahkan atau diparafrase.
- **Identifier Inggris, prosa Indonesia:** nama variabel, fungsi, file, branch, dan commit dalam bahasa Inggris. Komentar dan dokumentasi dalam bahasa Indonesia.
- **Tidak ada kode mati:** import yang tidak dipakai, fungsi yang tidak dipanggil, dan komentar yang menjelaskan "apa" bukan "mengapa" dihapus.
- **Quality gate scaffold yang tersedia:** `bunx biome check .`, `bun run typecheck`, `bun test`, dan `bun run build:web`. `bun run e2e` menunggu kartu wiring yang menambahkan harness Playwright.

## 1.2 Yang tidak boleh

- Hardcode string UI di luar message catalog.
- `console.log` di kode produksi (pakai logger terstruktur).
- `Date.now()` langsung di service; pakai Clock port.
- `fs` langsung di handler; pakai Storage port.
- Menetapkan `status` pinjaman langsung di handler atau repository; wajib lewat `LoanService.transition(...)`.

## Cross-References

- [02-typescript.md](02-typescript.md)
- [../technical-specs/03-repository-structure.md](../technical-specs/03-repository-structure.md)
