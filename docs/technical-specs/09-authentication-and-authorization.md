**Version:** 0.1
**Date:** 2026-11-05
**Author:** Tech Lead
**Status:** Draft
**Phase:** Technical Specification

# Authentication and Authorization - ReadOnly

## Mekanisme (P-12)

- Sesi server-side via cookie HttpOnly, Secure, SameSite=Lax.
- Token sesi di-hash di `sessions.token_hash`; server-side session check terhadap tabel.
- Hash password bcrypt (SEC-01).
- Rate limit login per IP dan per email; melampaui batas → HTTP 429 (SEC-06, Q-04).

## Alur register dua langkah (Q-05)

1. **Langkah 1 - `POST /auth/register/validate`:** validasi 6 field mandatory (nama, email, alamat, nomor ponsel, password, konfirmasi password), format email, konfirmasi password sama, dan keunikan email. Bila valid → alihkan ke halaman Pilih Genre. Bila email sudah terdaftar → 409.
2. **Langkah 2 - Pilih Genre (multitag, wajib ≥1) + `POST /auth/register`:** validasi genre, hash password, simpan `users` + `user_genres`. Email dicek ulang (race condition) → 409 bila beradu.

> **Note:** AC-01.03–AC-01.05 menyebut tombol "Daftar" padahal field ada di langkah 1 bertombol "Next" (Q-05). Validasi terjadi saat "Next"; keunikan email dicek di "Next" (409) dan diulang di "Daftar".

## Alur login

- `POST /auth/login`: cek kredensial dan status akun. User `inactive` tidak dapat login dan mendapat pesan AC-12.07 `Akun Anda tidak aktif. Silakan hubungi Admin Perpus.`. User `active` yang valid mendapat sesi.
- Pesan error berbeda untuk password salah ("email and Password tidak sama") dan email tidak terdaftar ("Email Not Registered") - risiko enumerasi yang diterima BA (Q-07).
- Redirect per role:
  - Member → halaman beranda (AC-02.01).
  - Admin Perpus → halaman Dashboard (AC-02.05).
  - Member membuka halaman Admin → ditolak 403 (akses objek).

## Alur logout (AC-03.01)

- `POST /auth/logout`: hapus baris sesi → redirect ke halaman Login.

## Matriks peran

| Operasi | Admin Perpus | Member |
| --- | --- | --- |
| register | Tidak berlaku | AC-01.01–AC-01.08 |
| login | AC-02.05 | AC-02.01, AC-02.02, AC-02.03, AC-02.04 |
| logout | AC-03.01 | AC-03.01 |
| master buku | AC-05.01–AC-05.10 | Tidak berlaku |
| Master Genre | AC-11.01–AC-11.10 | Tidak berlaku |
| Management User | AC-12.01–AC-12.11 | Tidak berlaku |
| katalog | Melihat semua | AC-07.01–AC-07.04 |
| peminjaman (ajukan) | Tidak berlaku | AC-08.01–AC-08.02, AC-08.04, AC-08.05 |
| konfirmasi QR | AC-08.03, AC-08.06 | Tidak berlaku |
| dashboard | AC-04.01 | Tidak berlaku |
| daftar pinjaman | AC-06.01–AC-06.02 | Tidak berlaku |
| kembalikan (ajar) | Tidak berlaku | AC-09.01, AC-09.02, AC-09.06, AC-09.07 |
| konfirmasi pengembalian | AC-09.03, AC-09.05 | Tidak berlaku |
| pembayaran denda | AC-09.04, AC-09.08, AC-09.09, AC-09.10 | Tidak berlaku |
| notifikasi dan popup reminder | Tidak berlaku | AC-10.01–AC-10.08 |

## Q-35 dan pemecahan kartu

Spreadsheet terbaru mencantumkan persona `Member, Admin` untuk US-08 dan US-09. Dokumen bisnis mempertahankan struktur sumber; kartu kerja dipisah sesuai aktor pada tiap AC dan tidak digabung dalam satu PR.

## Cross-References

- [07-security.md](07-security.md)
- [06-data-model.md](06-data-model.md)
- [api-specs/02-authentication.md](../api-specs/02-authentication.md)
- [docs/task-breakdown/team-and-process.md](../task-breakdown/team-and-process.md)

## Open Follow-ups

Bootstrap Admin pertama dan invalidasi sesi saat penonaktifan user masih perlu diputuskan. Q-04 (teks rate limit) tetap terbuka; Q-02 dan Q-06 diperbarui pada grooming final.
