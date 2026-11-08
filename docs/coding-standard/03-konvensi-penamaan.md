**Version:** 0.1  
**Date:** 2026-11-05  
**Author:** Tech Lead  
**Status:** Draft  
**Phase:** Coding Standard  

# Konvensi Penamaan - ReadOnly

## 3.1 File dan folder

| Jenis | Pola | Contoh |
| --- | --- | --- |
| Modul API | `apps/api/src/modules/<name>/` | `loans/` |
| Halaman web | `apps/web/src/pages/<Pascal>/` | `BookDetail/` |
| Skema DB | `packages/db/src/schema/<name>.ts` | `loans.ts` |
| Tes | `*.test.ts` di samping file | `calculate-fine.test.ts` |
| Migrasi | timestamp Drizzle | `<pin at scaffold>` |

## 3.2 Identifier

- Fungsi dan variabel: `camelCase`.
- Tipe dan komponen Solid: `PascalCase`.
- Konstanta modul: `SCREAMING_SNAKE_CASE` hanya untuk konstanta di `packages/shared/constants.ts`.
- Kolom database: `snake_case`.
- Kode error API: `snake_case` Inggris (`invalid_state_transition`).
- Status pinjaman di database: `SCREAMING_SNAKE` (`RETURN_PENDING`). Label UI tidak disimpan sebagai nilai kolom.

## 3.3 Branch dan commit

- Branch: `<type>/<CARD-ID>-<kebab-deskripsi>` misalnya `feat/BE-S1-02-auth-login`.
- Commit subject: Inggris, imperatif, diawali tipe (`feat:`, `fix:`, `docs:`, `test:`, `chore:`).
- Body commit menyebut Card ID dan AC yang disentuh.

## Cross-References

- [11-pr-hygiene.md](11-pr-hygiene.md)
- [../task-breakdown/team-and-process.md](../task-breakdown/team-and-process.md)
