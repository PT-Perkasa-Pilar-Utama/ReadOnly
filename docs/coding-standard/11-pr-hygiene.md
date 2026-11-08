**Version:** 0.1  
**Date:** 2026-11-05  
**Author:** Tech Lead  
**Status:** Draft  
**Phase:** Coding Standard  

# PR Hygiene - ReadOnly

Ini adalah **satu-satunya** dokumen standar yang mengatur higiene pull request. Checklist review tidak mengulang aturan di bawah; checklist menaut ke sini.

## Branch

- Pola: `<type>/<CARD-ID>-<kebab-deskripsi>`.
- Satu kartu = satu PR. Tidak menggabung dua Card ID.

## Commit

```gitcommit
<type>(<scope>): <short summary>

Refs: <CARD-ID>
AC: <AC-XX.YY>
Tags: [ASSUMED Q-NN] (optional)
```

- Subject Inggris, imperatif, diawali `feat:`, `fix:`, `test:`, `docs:`, `chore:`, `refactor:`.
- Body: Card ID, daftar AC, catatan asumsi Q-NN jika ada.
- Tidak ada commit yang berisi `.env`, dump database, atau file cover asli.

## Pull request

- Isi [PULL_REQUEST_TEMPLATE.md](../../.github/PULL_REQUEST_TEMPLATE.md) lengkap.
- Gate scaffold sebelum buka PR: `bunx biome check .`, `bun run typecheck`, `bun test`, dan `bun run build:web` untuk perubahan web.
- Diff tidak mengandung `console.log`, `any`, atau string UI yang menyimpang dari AC.
- Operation Status Tracker di `docs/api-specs/_index.md` diubah `TODO` menjadi `OK` untuk operasi yang selesai di kartu ini.

## Review

- Reviewer utama: TL.
- PR milik TL: reviewer BE1 atau FE1 sesuai area `[ASSUMED Q-37]`.
- Metode: lead-review tiga ronde, temuan ber-ID beku, THEN-clause AC ditelusuri.

## Merge

- Squash atau rebase sesuai kebijakan repo setelah scaffold. Tidak merge PR merah.
- Setelah merge, kartu PM dipindah sesuai Definition of Done di team-and-process.

## Cross-References

- [../code-review-checklist/01-pr-hygiene.md](../code-review-checklist/01-pr-hygiene.md)
- [../task-breakdown/team-and-process.md](../task-breakdown/team-and-process.md)
- [.github/PULL_REQUEST_TEMPLATE.md](../../.github/PULL_REQUEST_TEMPLATE.md)
