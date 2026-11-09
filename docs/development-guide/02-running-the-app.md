**Version:** 0.2  
**Date:** 2026-11-08  
**Author:** Tech Lead  
**Status:** Scaffold `TL-S1-01` tersedia  
**Phase:** Development Guide

# Running the App

Dari root repo, jalankan `bun run dev` untuk menyalakan API dan web bersamaan. Jika ingin menjalankan satu per satu, gunakan dua terminal:

| Proses | Perintah | URL |
| --- | --- | --- |
| API | `bun run dev:api` | `http://localhost:3000/api/v1` |
| Web | `bun run dev:web` | `http://localhost:5173` |
| Health | `curl http://localhost:3000/api/v1/health` | HTTP 200 |

Health response scaffold:

```json
{ "data": { "api": "ok", "db": "error", "storage": "error" } }
```

Nilai `db` dan `storage` default `error` karena adapter belum menjadi bagian scaffold. Route tetap mengembalikan HTTP 200 sesuai kontrak operasional.

Quality checks yang tersedia dari root:

```bash
bun run typecheck
bun test
bunx biome check .
bun run build:web
```

Fitur login, kredensial Admin/Member, serta route reset-state belum tersedia. Route operasional `/admin/reset-state` dan `/admin/jobs/run` tidak boleh diregistrasikan di production (SEC-13) saat kartu terkait dikerjakan.

## Cross-References

- [01-local-setup.md](01-local-setup.md)
- [../api-specs/07-system.md](../api-specs/07-system.md)
