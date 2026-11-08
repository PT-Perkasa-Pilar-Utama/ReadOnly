**Version:** 0.1  
**Date:** 2026-11-05  
**Author:** Tech Lead  
**Status:** Draft  
**Phase:** Coding Standard  

# Keamanan dan Rahasia - ReadOnly

Setiap kontrol SEC-NN punya pasangan biner di [code-review-checklist/04-security.md](../code-review-checklist/04-security.md).

## 9.1 Hash password

- Password di-hash bcrypt di API sebelum disimpan. Salt rounds dari env (`BCRYPT_SALT_ROUNDS`). Tidak ada pemanggilan bcrypt di repository atau di frontend (SEC-01).

## 9.2 Sesi dan cookie

- Cookie HttpOnly, Secure (non-localhost), SameSite=Lax. Token sesi di-hash di `sessions.token_hash` (SEC-03).
- Logout menghapus baris sesi server-side.

## 9.3 Rahasia

- `SESS_SECRET`, `DATABASE_URL`, `ADMIN_PASSWORD` dari environment. Tidak di repo, tidak di log, tidak di response (SEC-14).
- `.env` masuk `.gitignore`. `.env.example` tanpa nilai nyata.

## 9.4 Rate limit

- Login, register, scan QR: 429 `rate_limit_exceeded`. Teks pesan `[COPY-TBD Q-04]` (SEC-06).

## 9.5 Upload cover

- Validasi MIME + magic bytes, maksimum 5 MiB, nama file acak, bukan nama asli pengguna (SEC-05, Q-13).

## 9.6 Token QR

- 128 bit `crypto.getRandomValues`, SHA-256 sebelum simpan, sekali pakai, tidak masuk log (SEC-12).

## 9.7 Endpoint operasional

- `POST /admin/reset-state` dan `POST /admin/jobs/run` **tidak terdaftar** bila `APP_ENV === 'production'` (SEC-13). Bukan 403.

## 9.8 PII

- Alamat dan nomor ponsel tidak masuk log, tidak masuk dashboard, tidak masuk response daftar (SEC-15).

## Cross-References

- [../technical-specs/07-security.md](../technical-specs/07-security.md)
- [10-error-handling-dan-logging.md](10-error-handling-dan-logging.md)
