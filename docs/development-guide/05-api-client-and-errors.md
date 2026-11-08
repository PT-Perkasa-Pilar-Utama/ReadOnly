**Version:** 0.1  
**Date:** 2026-11-05  
**Author:** Tech Lead  
**Status:** Draft  
**Phase:** Development Guide  

# API Client and Errors

Frontend tidak memanggil `fetch` langsung. Semua lewat `apps/web/src/api/`.

## Pemetaan

- `code` Inggris menentukan cabang UI.
- `message` ditampilkan persis. Jangan menerjemahkan ulang string BA.
- 401 membersihkan sesi dan mengarahkan ke Login.
- 403 pada rute Admin untuk Member menampilkan penolakan, bukan Dashboard.
- 409 stok habis memakai pesan AC-08.04 `[COPY-TBD Q-15]` sampai BA menutup teksnya. Jika AC sudah punya kalimat, kalimat AC menang.

## Cross-References

- [../api-specs/01-conventions.md](../api-specs/01-conventions.md)
- [../coding-standard/05-frontend-solidjs.md](../coding-standard/05-frontend-solidjs.md)
