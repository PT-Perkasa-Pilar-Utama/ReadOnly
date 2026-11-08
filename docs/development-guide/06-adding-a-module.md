**Version:** 0.1  
**Date:** 2026-11-05  
**Author:** Tech Lead  
**Status:** Draft  
**Phase:** Development Guide  

# Adding a Module

Modul API yang diizinkan sudah tetap: auth, books, loans, notifications, dashboard, jobs, system.

Jangan menambah modul `ratings` atau `genres`. Lihat deletion test di [03-repository-structure](../technical-specs/03-repository-structure.md).

## Urutan kartu baru

1. AC sudah ada di business docs. Jangan membuat AC ID baru di `docs/business/`.
2. Kontrak di `docs/api-specs/` dengan status tracker `TODO`.
3. Skema shared, lalu service, lalu handler.
4. Tes.
5. Tracker menjadi `OK` pada PR yang menyelesaikan operasi.

## Cross-References

- [../coding-standard/04-desain-modul-dan-api.md](../coding-standard/04-desain-modul-dan-api.md)
- [../technical-specs/05-module-definitions.md](../technical-specs/05-module-definitions.md)
