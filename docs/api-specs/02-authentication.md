**Version:** 0.2
**Date:** 2026-11-08
**Author:** Tech Lead
**Status:** Operasi lama tetap mengikuti status masing-masing; kontrak US-12 disetujui TL
**Phase:** API Specification

# Authentication API - ReadOnly

Base: `/api/v1`

## POST /auth/register/validate (Q-05)

- **Purpose:** validasi langkah 1 register; cek keunikan email.
- **Access:** publik.
- **Input:**

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| full_name | string | yes | mandatory, panjang aman |
| email | string | yes | format email |
| address | string | yes | mandatory |
| phone_number | string | yes | mandatory, tanpa format v1 (Q-08) |
| password | string | yes | min 8 (Q-04) |
| confirm_password | string | yes | sama dengan password |

- **Behavior:**
  1. Validasi skema; bila gagal → 422 dengan pesan dari Message catalog.
  2. Cek keunikan email → 409 bila sudah ada (`email sudah terdaftar`, AC-01.08).
  3. Sukses → 200 `{ data: { step: 2 } }`.
- **Output:** 200 `{ data: { step: 2 }, message: "Data valid" }`. (pesan `step:2` `[COPY-TBD Q-05]`)
- **Errors:** `invalid_request` 422 (AC-01.03–AC-01.05), `conflict` 409 (AC-01.08).
- **Traceability:** AC-01.03, AC-01.04, AC-01.05, AC-01.08.

## POST /auth/register (Q-05)

- **Purpose:** registrasi final + simpan genre.
- **Access:** publik.
- **Input:**

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| full_name | string | yes | |
| email | string | yes | |
| address | string | yes | |
| phone_number | string | yes | |
| password | string | yes | |
| confirm_password | string | yes | |
| genres | string[] | yes | ≥1 genre, validasi saat "Daftar" (Q-05) |

- **Behavior:**
  1. Validasi genre (AC-01.06).
  2. Hash password bcrypt (SEC-01).
  3. Cek ulang keunikan email (race) → 409.
  4. Insert users + user_genres → commit.
- **Output:** 201 `{ data: { userId, role: 'member' }, message: "Akun berhasil dibuat" }`.
- **Errors:** `invalid_request` 422, `conflict` 409.
- **Traceability:** AC-01.02, AC-01.06.

## POST /auth/login

- **Purpose:** autentikasi.
- **Access:** publik.
- **Input:** email, password.
- **Behavior:**
  1. Rate limit per IP+email (SEC-06).
  2. Cek kredensial → hash mismatch → "email and Password tidak sama" (AC-02.02).
  3. Email tidak ada → "Email Not Registered" (AC-02.03).
  4. User berstatus `inactive` → tolak login dan tampilkan `Akun Anda tidak aktif. Silakan hubungi Admin Perpus.` (AC-12.07).
  5. Sukses untuk user `active` → buat sesi, set cookie HttpOnly Secure SameSite=Lax.
- **Output:** 200 `{ data: { token: "session-secret" }, message: "Login Berhasil" }`.
- **Errors:** `invalid_credentials` 422, `user_not_found` 422, `account_inactive` 403, `rate_limit_exceeded` 429.
- **Traceability:** AC-02.01, AC-02.02, AC-02.03, AC-02.04.

## POST /auth/logout

- **Purpose:** matikan sesi server-side (AC-03.01).
- **Access:** login.
- **Input:** none (cookie sesi).
- **Behavior:** hapus baris sesi → redirect login (FE-side).
- **Output:** 204.
- **Errors:** `session_not_found` 401.
- **Traceability:** AC-03.01.

## GET /auth/me

- **Purpose:** profil sesi saat ini (AC-02.01, AC-02.05).
- **Access:** login.
- **Output:** 200 `{ data: { id, full_name, role, email } }`. UI menampilkan email di pojok kanan atas sesuai AC-02.01; jangan menggantinya dengan nama lengkap (Q-06 superseded).
- **Errors:** `session_not_found` 401.
- **Traceability:** AC-02.01, AC-02.05.

## GET /genres

- **Purpose:** pilihan genre aktif (Pilih Genre, Tambah/Edit Buku, Home).
- **Access:** publik.
- **Output:** 200 `{ data: [{ id, name }] }`; genre `inactive` tidak disertakan.
- **Traceability:** AC-01.07, AC-05.07, AC-07.02, AC-11.02, AC-11.06, AC-11.07.

## API Contract: Management User (US-12)

> **Keputusan TL:** path dan skema berikut adalah kontrak v1 yang disetujui untuk implementasi; BE mengikuti kontrak dan FE mengonsumsinya. Penambahan route `GET /admin/users/:id` menyediakan data awal form Edit tanpa mengekspos alamat di daftar. Implementasi seluruh route tetap `TODO` sampai kartu terkait dikerjakan.

### GET /admin/users

- **Access:** admin.
- **Query:** `q` opsional (substring tanpa membedakan kapitalisasi pada `full_name` atau `email`), `role` opsional (`admin` atau `member`), `page` default `1`, `limit` default `10` dan maksimum `50`.
- **Output:** HTTP 200 paginasi berisi `{ id, full_name, email, phone_number, role, status }`. `role` bernilai `admin`/`member`; `status` bernilai `active`/`inactive`. Alamat tidak dikirim pada daftar. Password dan hash tidak pernah dikirim.
- **Hasil kosong:** HTTP 200 dengan `data: []`; FE menampilkan `User tidak ditemukan` sesuai AC-12.11.
- **Errors:** `session_not_found` 401, `forbidden` 403, `invalid_request` 422 untuk query tidak valid.
- **Traceability:** AC-12.01, AC-12.11. Nomor ponsel hanya disertakan pada respons Management User yang terotorisasi (SEC-15).

### GET /admin/users/:id

- **Access:** admin.
- **Output:** HTTP 200 `{ data: { id, full_name, email, phone_number, address, role, status } }`. `address` berisi alamat Member dan `null` untuk Admin. Password dan hash tidak pernah dikirim.
- **Errors:** `session_not_found` 401, `forbidden` 403, `not_found` 404.
- **Traceability:** AC-12.05. Route ini dipakai FE untuk memuat nilai awal form Edit User.

### POST /admin/users

- **Access:** admin.
- **Request JSON:** `{ full_name, email, phone_number, password, confirm_password }`; seluruh field wajib. Format nomor ponsel mengikuti aturan v1 yang sama dengan registrasi (tanpa validasi format tambahan, Q-08).
- **Behavior:** validasi field dan format email; email harus unik; password dan konfirmasi harus sama; password di-hash; akun dibuat dengan `role: 'admin'` dan `status: 'active'`. `address` tidak dikirim untuk akun Admin baru.
- **Output:** HTTP 201 `{ data: { id, full_name, email, phone_number, role: 'admin', status: 'active' }, message: 'Admin berhasil ditambahkan' }`.
- **Errors:** `invalid_request` 422 dengan copy AC `Field harus diisi!`, `Format email salah`, atau `Password harus sama` dan `data.field`; `conflict` 409 dengan `Email sudah terdaftar`.
- **Traceability:** AC-12.02–AC-12.04.

### PATCH /admin/users/:id

- **Access:** admin.
- **Request JSON:** untuk Member, `{ full_name, phone_number, address }`; untuk Admin, `{ full_name, phone_number }`. Semua field editable untuk role tersebut wajib dikirim dan tidak boleh kosong. `email` dan `role` tidak dapat diubah.
- **Behavior:** jika target adalah Member, perubahan `address` diperbolehkan. Untuk Admin, `address` tidak diterima. Jika body menyertakan field di luar kontrak, `invalid_request` 422.
- **Output:** HTTP 200 `{ data: { id, full_name, phone_number, address, role }, message: 'Data user berhasil diubah' }`; `address` bernilai `null` untuk Admin.
- **Errors:** `session_not_found` 401, `forbidden` 403, `not_found` 404, `invalid_request` 422 dengan copy AC `Field harus diisi!` dan `data.field` untuk field wajib kosong.
- **Traceability:** AC-12.03, AC-12.05.

### PATCH /admin/users/:id/status

- **Access:** admin.
- **Request JSON:** `{ status: 'active' | 'inactive' }`.
- **Behavior:** larang Admin menonaktifkan akunnya sendiri; penonaktifan ditolak jika target memiliki peminjaman dengan status selain `RETURNED`; akun `inactive` ditolak saat login. Kontrak ini menetapkan penolakan login berikutnya; perilaku sesi yang sudah aktif setelah akun dinonaktifkan tetap menjadi keputusan keamanan terpisah karena belum ditetapkan AC.
- **Output:** HTTP 200 `{ data: { id, status }, message: 'Akun berhasil dinonaktifkan' | 'Akun berhasil diaktifkan' }`.
- **Errors:** `session_not_found` 401, `forbidden` 403, `not_found` 404, `invalid_request` 422 untuk status selain `active`/`inactive`, `cannot_deactivate_self` 403 untuk nonaktifkan diri sendiri, `account_has_active_loans` 409 dengan copy AC `Akun tidak dapat dinonaktifkan karena masih memiliki peminjaman aktif`.
- **Traceability:** AC-12.06–AC-12.10.

## Cross-References

- [01-conventions.md](01-conventions.md)
- [09-authentication-and-authorization.md](../technical-specs/09-authentication-and-authorization.md)
- [11-environment-configuration.md](../technical-specs/11-environment-configuration.md)
- [docs/business/acceptance-criteria.md](../business/acceptance-criteria.md)
