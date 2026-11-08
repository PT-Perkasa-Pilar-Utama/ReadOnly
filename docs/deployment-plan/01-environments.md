**Version:** 0.1  
**Date:** 2026-11-05  
**Author:** Tech Lead  
**Status:** Draft  
**Phase:** Deployment Plan  

# Environments - ReadOnly

Dokumen ini mendefinisikan empat lingkungan deployment sistem ReadOnly: Development, Test/CI, Staging (UAT), dan Production.

## 1. Matriks Lingkungan

| Parameter | Development | Test / CI | Staging (UAT) | Production |
| --- | --- | --- | --- | --- |
| **Tujuan** | Pengembangan lokal engineer | Otomasi pengujian PR | UAT bersama Product Owner & QA | Lingkungan langsung pengguna akhir |
| **Host** | Mesin lokal / workstation | GitHub Actions runner / CI node | Single VPS Staging | Single VPS Production |
| **URL Frontend** | `http://localhost:5173` | `http://localhost:5173` | `https://staging-readonly.example.com` | `https://readonly.example.com` |
| **URL API** | `http://localhost:3000/api/v1` | `http://localhost:3000/api/v1` | `https://staging-readonly.example.com/api/v1` | `https://readonly.example.com/api/v1` |
| **Protokol Web** | HTTP (kecuali tes kamera) | HTTP | HTTPS (wajib) | HTTPS (wajib) |
| **Database** | PostgreSQL 16 (Compose lokal) | PostgreSQL 16 (CI service) | PostgreSQL 16 (Docker volume) | PostgreSQL 16 (Docker volume terisolasi) |
| **Database Name** | `readonly_dev` | `readonly_test` | `readonly_staging` | `readonly_prod` |
| **Storage Cover** | Local folder `./storage/covers` | Temp dir `tmp/covers` | Named volume `readonly_staging_covers` | Named volume `readonly_prod_covers` |
| **Log Level** | `debug` | `info` | `info` | `warn` |
| **Reset State API** | Aktif (`ENABLE_RESET_API=true`) | Aktif (`ENABLE_RESET_API=true`) | Nonaktif (`ENABLE_RESET_API=false`) | **TIDAK TERDAFTAR** (Route diabaikan) |
| **Run Job Manual API** | Aktif (`POST /admin/jobs/run`) | Aktif (`POST /admin/jobs/run`) | Nonaktif | **TIDAK TERDAFTAR** |
| **Seed Bawaan** | Dev seed (buku dasar + genres) | QA seed (skenario lengkap 6 status) | QA seed atau data UAT | Admin + genres saja |

## 2. Persyaratan HTTPS dan Akses Kamera Browser (SEC-17, Q-01)

Sistem peminjaman ReadOnly menggunakan pemindaian QR Code melalui kamera browser perangkat Admin (US-08, AC-08.03).

- **Standard W3C MediaDevices / getUserMedia:** browser modern mewajibkan *Secure Context* untuk mengaktifkan antarmuka kamera.
- **Development:** `localhost` dan `127.0.0.1` diperlakukan secara istimewa oleh browser sebagai Secure Context meskipun memakai protokol HTTP tanpa TLS.
- **Staging dan Production:** **Wajib menggunakan HTTPS** dengan sertifikat TLS valid (Let's Encrypt atau sertifikat korporat). Browser akan menolak akses kamera (`navigator.mediaDevices is undefined` atau `NotAllowedError`) jika aplikasi dibuka melalui HTTP biasa tanpa TLS.
- Reverse proxy Nginx pada port 443 bertugas melakukan terminasi TLS dan mengarahkan seluruh request HTTP (port 80) ke HTTPS (HTTP 301 Permanent Redirect).

## 3. Isolasi Rahasia (Secrets Management, SEC-14)

1. Tidak ada nilai rahasia (`DATABASE_URL`, `SESS_SECRET`, `ADMIN_PASSWORD`) yang di-*commit* ke dalam repositori git.
2. File template `.env.example` hanya memuat kunci dan nilai dummy untuk lingkungan Development.
3. Lingkungan Staging dan Production mengambil nilai rahasia dari environment runner deployment atau secret store aman (misal GitHub Secrets, Doppler, atau file `.env.production` dengan permission `chmod 600` pada VPS).

## Cross-References

- [02-infrastructure.md](02-infrastructure.md)
- [06-database-reset.md](06-database-reset.md)
- [../technical-specs/07-security.md](../technical-specs/07-security.md)
- [../technical-specs/11-environment-configuration.md](../technical-specs/11-environment-configuration.md)
- [../decisions/2026-11-05-grooming-readonly.md](../decisions/2026-11-05-grooming-readonly.md) (Q-01, Q-02)
