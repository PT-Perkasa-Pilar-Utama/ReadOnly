**Version:** 0.1
**Date:** 2026-11-05
**Author:** Tech Lead
**Status:** Draft
**Phase:** Technical Specification

# Environment Configuration - ReadOnly

Setiap variabel lingkungan beranotasi. Nilai rahasia (secret) **tidak boleh** ada di repo. Scaffold menyediakan template root `.env.example` berisi nilai development lokal yang aman; salin ke `.env` dan jangan commit file hasil salinan. Variabel seed Admin belum digunakan sampai kartu DB menambahkan seeder.

## Variabel lingkungan

| Variabel | Development | Test/CI | Staging (UAT) | Production | Keterangan |
| --- | --- | --- | --- | --- | --- |
| `APP_ENV` | `development` | `test` | `staging` | `production` | Mengontrol fitur operasional |
| `DATABASE_URL` | `postgresql://readonly:seed123@localhost:5432/readonly` | `postgresql://readonly:test@localhost:5432/readonly_test` | sesuai VPS | sesuai VPS (manajer secret) | Nilai lokal tersedia di `.env.example`; belum dikonsumsi API scaffold sebelum kartu DB |
| `SESS_SECRET` | `dev-session-secret-please-change` | `ci-session-secret-please-change` | generator dari CI secret store | generator dari CI secret store | Session signing secret; `generateSecret()` |
| `STORAGE_DIR` | `./storage/covers` | `./storage/covers` (tmp) | `/data/covers` | `/data/covers` | Volume Docker `cover` |
| `TZ` | `Asia/Jakarta` | `UTC` | `Asia/Jakarta` | `Asia/Jakarta` | Container; timestamp disimpan UTC |
| `CORS_ORIGIN` | `http://localhost:5173` | `http://localhost:5173` | `https://readonly.example.com` | `https://readonly.example.com` | Satu origin, bukan `*` (SEC-08) |
| `LOG_LEVEL` | `debug` | `info` | `info` | `warn` | Tidak menyimpan PII (SEC-15) |
| `ADMIN_EMAIL` | `admin@readonly.ppu.co.id` | `admin@readonly.ppu.co.id` | dari secret store | dari secret store | Kredensial Admin Perpus seeder (Q-02) |
| `ADMIN_PASSWORD` | `password123` (ubah di staging/prod) | `password123` | dari secret store | dari secret store | Bawaan seeder; **wajib diubah** di staging/prod |
| `BCRYPT_SALT_ROUNDS` | `11` | `10` | `11` | `12` | Kekuatan hash (SEC-01) |
| `QR_RATE_LIMIT_WINDOW_MIN` | `10` | `10` | `10` | `5` | Menit untuk rate limit scan QR (SEC-06) |
| `LOGIN_RATE_LIMIT` | `5` | `5` | `5` | `5` | Percobaan gagal per window (SEC-06) |
| `ENABLE_RESET_API` | `true` | `true` | `false` | `false` (tidak ada) | Mengaktifkan `/admin/reset-state` |
| `RESET_STATE_SEED` | `dev` | `qa` | - | - | Seed dev/qa dipilih endpoint reset |

## Nilai flag reset di produksi

Di production: `APP_ENV=production`, `ENABLE_RESET_API` **tidak ada** (off). Route `POST /admin/reset-state` **tidak terdaftar**; respon 404. Bukan sekadar dibatasi akses - route-nya tidak ada di aplikasi.

## Konstanta bisnis (bukan variabel lingkungan)

Konstanta berikut **tidak boleh** jadi environment variable; letaknya di `packages/shared/src/constants.ts`:

- Masa pinjam: **7 hari**
- Reminder: **3 hari** sebelum batas
- Denda: **Rp 2.000** flat untuk 1–4 hari; batas atas input Admin **99.999.999**
- Ambang denda otomatis: **1 sampai 4 hari**; input manual **≥5 hari**
- Max cover: **5 MiB**

## Konfigurasi seed Admin

Seed dev dan seed QA membaca kredensial Admin Perpus dari `ADMIN_EMAIL`/`ADMIN_PASSWORD` (Q-02). Seed dev dan seed QA bersifat idempoten dan dikontrol versi di `packages/db/src/seeds/`.

## Cross-References

- [06-data-model.md](06-data-model.md)
- [docs/deployment-plan/03-initial-deployment.md](../deployment-plan/03-initial-deployment.md)
- [docs/deployment-plan/06-database-reset.md](../deployment-plan/06-database-reset.md)
- [docs/coding-standard/_index.md](../coding-standard/_index.md)
- [docs/onboarding/03-environment-setup.md](../onboarding/03-environment-setup.md)

## Open Follow-ups

Q-02 (kebijakan rotasi kredensial Admin), Q-32 (tidak ada NFR resmi untuk tuning env).
