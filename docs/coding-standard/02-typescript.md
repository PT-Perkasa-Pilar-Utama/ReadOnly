**Version:** 0.1  
**Date:** 2026-11-05  
**Author:** Tech Lead  
**Status:** Draft  
**Phase:** Coding Standard  

# TypeScript - ReadOnly

## 2.1 Konfigurasi

- `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`.
- Target dan module resolution: `<pin at scaffold>` (TL-S1-01).
- Tidak ada `// @ts-ignore` atau `// @ts-expect-error` tanpa komentar alasan dan tiket.

## 2.2 Tipe

- Tipe domain (status pinjaman, peran, kode error) adalah union literal, bukan `string`.
- Input request divalidasi skema `packages/shared` sebelum masuk handler. Tipe hasil validasi dipakai, bukan `req.body` mentah (SEC-07).
- Fungsi yang bisa gagal mengembalikan `Result<T, E>` atau melempar error bertipe dari envelope, bukan `throw new Error(string)` generik.
- `null` vs `undefined`: kolom database nullable dipetakan ke `T | null`. Optional field request adalah `T | undefined`.

## 2.3 Impor

- Impor absolut dari workspace (`@readonly/shared`, `@readonly/db`). Tidak ada relative import yang naik lebih dari satu tingkat (`../../..`).
- Type-only import memakai `import type`.

## Cross-References

- [04-desain-modul-dan-api.md](04-desain-modul-dan-api.md)
- [../api-specs/01-conventions.md](../api-specs/01-conventions.md)
