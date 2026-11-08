**Version:** 0.1  
**Date:** 2026-11-05  
**Author:** Tech Lead  
**Status:** Draft  
**Phase:** Coding Standard  

# Desain Modul dan API - ReadOnly

## 4.1 Batas modul

Modul API yang diizinkan: `auth`, `books`, `loans`, `notifications`, `dashboard`, `jobs`, `system`.

- `ratings` bukan modul. Rata-rata rating hidup di `books` (deletion test di spek 03).
- `genres` bukan modul mandiri. CRUD Master Genre berada di modul `books`; dropdown genre aktif dipakai oleh `books` dan `auth` (US-11).

## 4.2 Handler

- Handler tipis: validasi skema, panggil service, petakan error ke envelope.
- Tidak ada query SQL di handler.
- Tidak ada aturan bisnis denda di handler. `calculateFine` di `packages/shared`.

## 4.3 Envelope

- Sukses: `{ data, message }`.
- Error: `{ statusCode, error, message, data? }`.
- `code` error Inggris; `message` bahasa UI persis katalog di [01-conventions](../api-specs/01-conventions.md).
- Teks BA yang sudah ada tidak diubah, termasuk `email and Password tidak sama`, `Email Not Registered`, dan `mendafta` pada AC-01.01.

## 4.4 Paginasi

- Default `limit=10`, maksimum 50 (Q-12).
- Urutan daftar default terbaru dulu kecuali AC menyebut lain.

## Cross-References

- [../technical-specs/05-module-definitions.md](../technical-specs/05-module-definitions.md)
- [../api-specs/01-conventions.md](../api-specs/01-conventions.md)
