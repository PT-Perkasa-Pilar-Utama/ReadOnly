**Version:** 0.1  
**Date:** 2026-11-05  
**Author:** Tech Lead  
**Status:** Draft  
**Phase:** Deployment Plan  

# Initial Deployment - ReadOnly

Runbook target untuk deployment pertama ke Staging atau Production. Belum dapat dijalankan: scaffold saat ini belum memiliki Dockerfile API/Web, service Nginx, atau stack deployment lengkap. Perintah DB juga menunggu kartu DB.

## 1. Prasyarat

- VPS dengan Docker Engine dan Docker Compose plugin.
- Domain mengarah ke IP VPS (A record).
- Sertifikat TLS (Let's Encrypt via certbot, atau sertifikat yang sudah disiapkan).
- File `.env` di host (bukan di repo) dengan variabel dari [11-environment-configuration](../technical-specs/11-environment-configuration.md).
- `APP_ENV=staging` atau `APP_ENV=production`.
- `ENABLE_RESET_API` **tidak diset** di Production (route tidak terdaftar).
- `ADMIN_EMAIL` dan `ADMIN_PASSWORD` dari secret store, bukan nilai development.

## 2. Urutan

1. Clone repositori ke direktori deploy (misal `/opt/readonly`).
2. Salin `.env` ke direktori tersebut. Permission file: `chmod 600`.
3. Pasang sertifikat TLS ke path yang dibaca Nginx (`/etc/letsencrypt/live/...` atau volume `certs`).
4. Bangun image:

```bash
docker compose -f docker/compose.yml build
```

5. Naikkan database dulu, tunggu sehat:

```bash
docker compose -f docker/compose.yml up -d db
docker compose -f docker/compose.yml exec db pg_isready -U readonly
```

6. Jalankan migrasi. Perintah menyelesaikan path sendiri (tidak bergantung pada `cd` ke paket tertentu):

```bash
docker compose -f docker/compose.yml run --rm api bun run db:migrate
```

Skrip `db:migrate` di root `package.json` memanggil workspace `packages/db` dengan path absolut relatif terhadap root repo. Engineer tidak perlu `cd packages/db`.

7. Seed awal (hanya Admin + genres, bukan seed QA):

```bash
docker compose -f docker/compose.yml run --rm api bun run db:seed
```

8. Naikkan seluruh stack:

```bash
docker compose -f docker/compose.yml up -d
```

9. Verifikasi:

```bash
curl -fsS https://readonly.example.com/api/v1/health
```

Harapan: `{"data":{"api":"ok","db":"ok","storage":"ok"}}`.

10. Login Admin dengan kredensial dari env. Ganti password jika kebijakan rotasi sudah disetujui BA (Q-02 masih Open).

## 3. Yang tidak dilakukan pada deployment awal Production

- Jangan panggil `POST /admin/reset-state`. Route **tidak terdaftar** bila `APP_ENV=production` (SEC-13). Respons harus 404, bukan 403.
- Jangan panggil `POST /admin/jobs/run`. Route yang sama tidak terdaftar di production.
- Jangan memuat seed QA (enam status pinjaman sintetis) ke production.

## 4. Perintah migrasi yang menyelesaikan path sendiri

Kontrak untuk kartu DB-S1-01 dan TL-S1-01:

| Perintah (dari root repo) | Perilaku |
| --- | --- |
| `bun run db:migrate` | Menjalankan Drizzle migrate terhadap `DATABASE_URL`. Path skema diresolusi dari root, bukan dari cwd pemanggil. |
| `bun run db:seed` | Seed Admin dari `ADMIN_EMAIL` / `ADMIN_PASSWORD` dan genre seeder. Idempoten. |
| `bun run db:migrate` di dalam container | Sama, karena `WORKDIR` image adalah root monorepo. |

Jika perintah dijalankan dari subdirektori, skrip tetap menemukan `packages/db` lewat `import.meta.dir` / path repo root, bukan lewat cwd.

## Cross-References

- [01-environments.md](01-environments.md)
- [02-infrastructure.md](02-infrastructure.md)
- [04-release-updates.md](04-release-updates.md)
- [06-database-reset.md](06-database-reset.md)
- [../technical-specs/11-environment-configuration.md](../technical-specs/11-environment-configuration.md)
- [../api-specs/07-system.md](../api-specs/07-system.md)
