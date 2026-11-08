**Version:** 0.1  
**Date:** 2026-11-05  
**Author:** Tech Lead  
**Status:** Draft  
**Phase:** Development Guide  

# Branch, Commit, and PR

Satu-satunya aturan higiene PR ada di [11-pr-hygiene.md](../coding-standard/11-pr-hygiene.md). Dokumen ini hanya menunjuk ke sana.

- Branch: `feat/BE-S2-03-qr-confirm`
- Satu kartu, satu PR.
- Isi template PR.
- Gate sebelum push: `bunx biome check .`, `bun run typecheck`, dan `bun test`; jalankan `bun run build:web` untuk perubahan web. E2E menunggu kartu wiring.

Reviewer kartu TL: BE1 atau FE1 sesuai area `[ASSUMED Q-37]`.

## Cross-References

- [../code-review-checklist/01-pr-hygiene.md](../code-review-checklist/01-pr-hygiene.md)
- [../../.github/PULL_REQUEST_TEMPLATE.md](../../.github/PULL_REQUEST_TEMPLATE.md)
