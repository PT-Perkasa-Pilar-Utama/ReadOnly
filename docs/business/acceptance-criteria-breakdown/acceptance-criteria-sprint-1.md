# Acceptance Criteria: Sprint 1

> **Traceability historis:** file ini berisi alokasi awal 50 AC dalam rencana 3 sprint. Bukan alokasi aktif; rujukan Sprint 1 di dalamnya hanya konteks lama dan tidak menetapkan komitmen PM. Lihat [rundown satu sprint](../sprint-breakdown.md); scope dipilih saat Sprint Planning.

**Sprint Focus:** Fondasi, Autentikasi, dan Master Buku
**Version:** 0.1
**Date:** 2026-11-05

## User Stories in Scope

- US-01: Melakukan Register (Member baru) - 8 AC
- US-02: Melakukan Login (All) - 5 AC
- US-03: Melakukan Logout (All) - 1 AC
- US-05: Master Buku (Admin Perpus) - 9 AC

## US-01: Melakukan Register (Member baru)

### AC-01.01: Membuka Form Register

- **Subtask:** [FE] Render form 6 field + tombol "Next"; [BE] endpoint `/auth/register/validate` tersedia.

```gherkin
Given saya adalah pengguna baru yang ingin mendafta
  Or teks `mendafta` dipertahankan sesuai spreadsheet grooming final; jangan melengkapinya tanpa revisi BA.
  And berada di halaman Login
When saya menekan tombol Sign Up
Then tampil halaman form register
  - field Nama lengkap (Mandatory)
  - field Email (Mandatory)
  - field Alamat (Mandatory)
  - field Nomor Ponsel (Mandatory)
  - field Password (Mandatory)
  - field Konfirmasi Password (Mandatory)
  And tampil tombol "Next"
```

### AC-01.02: Register Berhasil

- **Subtask:** [FE] Form langkah 1 + Pilih Genre (multitag) dengan tombol "Daftar"; [BE] POST `/auth/register` hash password, simpan genre, pesan sukses.

```gherkin
Given saya adalah pengguna baru yang ingin mendaftar
  And berada di halaman Register
When saya mengisi form register dengan data yang valid
  And menekan tombol "Next"
  And memilih Genre yang diminati (terdiri dari beberapa genre dan bisa multitag), (Mandatory)
  Or "(Mandatory)" ditempatkan dalam kurung oleh sumber; genre wajib dipilih.
  And menekan tombol "Daftar"
Then tampil pesan sukses: "Akun berhasil dibuat"
  And diarahkan ke halaman Login
```

### AC-01.03: Validasi Field Mandatory Registrasi

- **Subtask:** [FE] Validasi inline 6 field saat "Next"; [BE] POST `/auth/register/validate` 422.
> **Note:** AC-01.03 menyebut tombol "Daftar", padahal field ada di langkah 1 yang bertombol "Next" (Q-05).

```gherkin
Given saya adalah pengguna baru yang ingin mendaftar
  And berada di halaman Register
When saya sengaja melanjutkan tanpa mengisi field mandatory
  Or menekan "Next" sesuai layout langkah 1 (AC-01.03 menyebut "Daftar", dianggap typo Q-05)
Then tampil pesan error dibawah field: "Field harus diisi!"
```

### AC-01.04: Validasi Konfirmasi password harus sama

> **Note:** AC-01.04 menyebut tombol "Daftar" (Q-05).

```gherkin
Given saya adalah pengguna baru yang ingin mendaftar
  And berada di halaman Register
When saya mengisi konfirmasi password tidak sama dengan password
  And menekan tombol "Daftar"
  Or "Next" sesuai layout langkah 1 (AC-01.04 menyebut "Daftar", dianggap typo Q-05)
Then tampil pesan error: "Password harus sama"
```

### AC-01.05: Validasi Format Email

> **Note:** AC-01.05 menyebut tombol "Daftar" (Q-05); format email yang invalid dari AC adalah `newmember.com`.

```gherkin
Given saya adalah pengguna baru yang ingin mendaftar
  And berada di halaman Register
When saya mengisi email tidak sesuai ketentuan (contoh, newmember.com)
  And menekan tombol "Daftar"
  Or "Next" sesuai layout langkah 1 (AC-01.05 menyebut "Daftar", dianggap typo Q-05)
Then tampil pesan error: "Format email salah"
```

### AC-01.06: Validasi Genre

- **Subtask:** [FE] Validasi multitag genre; [BE] POST `/auth/register` 422 bila genre kosong.

```gherkin
Given saya adalah pengguna baru yang ingin mendaftar
  And berada di halaman Register
When saya melanjutkan tanpa mengisi genre satupun
  Or menekan "Daftar" di halaman Pilih Genre
Then tampil pesan error: "Pilih minimal 1 genre"
```

### AC-01.07: Lanjut ke Halaman Pilih Genre

- **Subtask:** [FE] Rute terpisah Pilih Genre; [BE] `/genres` untuk dropdown.

```gherkin
Given saya adalah pengguna baru yang ingin mendaftar
  And berada di halaman Register
When saya mengisi semua field mandatory dengan data yang valid
  And menekan tombol "Next"
Then diarahkan ke halaman Pilih Genre
  And tampil daftar genre yang bisa dipilih lebih dari 1 (multitag)
  And tampil tombol "Daftar"
```

### AC-01.08: Validasi Email sudah Terdaftar

- **Subtask:** [BE] POST `/auth/register/validate` cek keunikan email, HTTP 409; [FE] pesan di bawah field Email.

```gherkin
Given saya adalah pengguna baru yang ingin mendaftar
  And berada di halaman Register
When saya mengisi email yang sudah terdaftar (contoh: "newmember@gmail.com")
  Or "newmember@gmail.com" adalah email fixture, bukan user asli.
  And menekan tombol "Next"
Then tetap berada di halaman Register
  And tampil pesan error di bawah field Email: "Email sudah terdaftar"
```

## US-02: Melakukan Login (All)

### AC-02.01: Login Berhasil

> **Note:** Ikuti AC-02.01: nilai email `newmember@gmail.com` ditampilkan di pojok kanan atas. Keputusan Q-06 yang mengubahnya menjadi nama lengkap telah digantikan oleh grooming final.

```gherkin
Given saya adalah pengguna terdaftar dengan email "newmember@gmail.com" dan password "password"
  And berada di halaman Login
When saya memasukkan "newmember@gmail.com" di kolom email
  And memasukkan "password" di kolom password
  Or "password" adalah password fixture; kredensial Admin Perpus datang dari variabel lingkungan, bukan hardcode (Q-02).
  And menekan tombol "Login"
Then tampil pesan sukses: "Login Berhasil"
  And diarahkan ke halaman beranda
  And tampil nama saya ditampilkan di pojok kanan atas halaman

```

### AC-02.02: Login Gagal karena Password Salah

> **Note:** Pesan login membedakan email tak terdaftar dan password salah (risiko enumerasi yang diterima, Q-07).

```gherkin
Given saya adalah pengguna terdaftar dengan email = "newmember@gmail.com" dan password = "password"
  And berada di halaman Login
When saya memasukkan email yang terdaftar misal "newmember@gmail.com" dan memasukkan password apapun
  And menekan tombol "Login"
Then tetap berada di halaman Login
  And tampil pesan error "email and Password tidak sama"
```

### AC-02.03: Login Gagal karena email Tidak Terdaftar

> **Note:** Pesan login membedakan email tak terdaftar dan password salah (risiko enumerasi yang diterima, Q-07).

```gherkin
Given saya adalah pengguna yang terdaftar
  And berada di halaman Login
  And belum mendaftarkan email
When saya memasukkan email yang tidak terdaftar misal "gabriel@gmail.com" dan memasukkan password apapun
  And menekan tombol "Login"
Then tetap berada di halaman Login
  And tampil pesan error "Email Not Registered"
```

### AC-02.04: Validasi Field Mandatory Login

```gherkin
Given saya adalah pengguna terdaftar dengan email = "newmember@gmail.com" dan password = "password"
  And berada di halaman Login
  And field email dan password bersifat mandatory
When saya tidak mengisi kolom email dan kolom password
  And menekan tombol "Login"
Then tetap berada di halaman Login
  And melihat pesan validasi di bawah field email "email tidak boleh kosong"
  And di bawah field password "Password tidak boleh kosong"
```

### AC-02.05: Login Berhasil sebagai Admin Perpus

- **Subtask:** [FE] Redirect per role (Member → beranda, Admin Perpus → Dashboard); [BE] role check.

```gherkin
Given saya adalah Admin Perpus yang terdaftar
  And berada di halaman Login
When saya memasukkan email dan password Admin Perpus yang benar
  Or kredensial Admin Perpus dari variabel lingkungan (Q-02), bukan hardcode.
  And menekan tombol "Login"
Then tampil pesan sukses: "Login Berhasil"
  And diarahkan ke halaman Dashboard
```

## US-03: Melakukan Logout (All)

### AC-03.01: Melakukan logout

- **Subtask:** [FE] Tombol Logout + redirect; [BE] POST `/auth/logout` matikan sesi server-side.

```gherkin
Given saya adalah pengguna yang terdaftar
  And berada di halaman manapun
When saya menekan tombol "Logout"
Then diarahkan ke halaman Login
```

## US-05: Master Buku (Admin Perpus)

### AC-05.01: Menambahkan Buku Baru

- **Subtask:** [FE] Form Add 8 field + upload cover; [BE] POST `/admin/books` upload multipart via Storage port, validasi.

```gherkin
Given saya seorang Admin Perpus
  And berada di halaman Master Buku
When saya menekan tombol "Add"
  And mengisi field informasi Buku:
  - Upload Cover Buku (Mandatory), format file .png, .jpg, .jpeg, max 5Mb
  Or 5 MiB pada sisi server; "5Mb" di AC berarti 5.000.000 atau 5.242.880 byte, perlu konfirmasi Q-13.
  - Judul Buku (Mandatory)
  - Penulis (Mandatory)
  - Penerbit (Mandatory)
  - Tahun Terbit (Mandatory)
  - Sinopsis (Mandatory)
  - Genre (Mandatory)
  - Jumlah Ketersediaan (Mandatory)
  And menekan tombol "Save"
Then tampil pesan sukses: "Buku berhasil ditambahkan"
  And diarahkan ke halaman Master Buku
```

### AC-05.02: Validasi Field Mandatory

```gherkin
Given saya seorang Admin Perpus
  And berada di halaman Master Buku
When saya tidak mengisi field mandatory
  And menekan tombol "Save"
Then tampil pesan error dibawah field: "Field harus diisi!"
```

### AC-05.03: Validasi Upload Cover Tidak sesuai Format

- **Subtask:** [BE] Validasi ekstensi, MIME, dan magic bytes (Q-13).

```gherkin
Given saya seorang Admin Perpus
  And berada di form penambahan master buku
When saya mengupload cover buku tidak sesuai format
  And menekan tombol "Save"
Then tampil pesan error: "Format file cover buku tidak sesuai"
```

### AC-05.04: Validasi Ukuran Upload Cover melebihi Ketentuan

```gherkin
Given saya seorang Admin Perpus
  And berada di form penambahan master buku
When saya mengupload cover buku melebihi 5Mb
  And menekan tombol "Save"
Then tampil pesan error: "Ukuran file cover buku tidak boleh lebih dari 5Mb"
```

### AC-05.05: Mengubah Data Buku

- **Subtask:** [BE] PATCH `/admin/books/:id`; [FE] Form Edit.

```gherkin
Given saya seorang Admin Perpus
  And berada di halaman Master Buku
When saya menekan icon Edit pada salah satu buku
  And mengubah field Jumlah Ketersediaan Buku
  And menekan tombol "Save"
Then tampil pesan sukses: "Buku berhasil diubah"
  And diarahkan ke halaman Master Buku
```

### AC-05.06: Menghapus Data Buku

> **Note:** Default engineering adalah soft delete agar riwayat peminjaman utuh (Q-11).

```gherkin
Given saya seorang Admin Perpus
  And berada di halaman Master Buku
When saya menekan icon Hapus pada salah satu buku
  And menekan OK pada alert rekonfirmasi "Apakah Anda yakin menghapus buku {judul_buku} ini?"
  And buku tidak memiliki peminjaman yang belum berstatus "Sudah Dikembalikan" (guard Q-11)
Then tampil pesan sukses: "Buku berhasil dihapus"
  And diarahkan kembali ke halaman Master Buku
```

### AC-05.07: Memfilter buku berdasarkan Penulis dan Genre

> **Note:** AC-05.07 menyebut "author", namun GLOSSARY dan dokumentasi memakai istilah "Penulis" (Q-08/Q-12).

```gherkin
Given saya seorang Admin Perpus
  And berada di halaman Master Buku
When saya menekan icon Filter
  And memilih Penulis (Dropdown)
  Or "author" pada sumber; GLOSSARY kanonik adalah "Penulis".
  Or memilih Genre (Dropdown)
  And menekan tombol "Set Filter"
Then hanya menampilkan buku sesuai filter yang dipilih
  And kolom Ketersediaan tetap menampilkan jumlah buku tersedia (contoh: "3 tersedia")
```

### AC-05.08: Mencari buku berdasarkan Judul Buku, penulis, atau genre

- **Subtask:** [BE] Pencarian `ILIKE`/`pg_trgm` pada Judul, Penulis, Genre (Q-12); [FE] kolom pencarian.

```gherkin
Given saya seorang Admin Perpus
  And berada di halaman Master Buku
When saya mengetikkan keyword judul buku/penulis/genre
Then hanya menampilkan buku sesuai keyword yang dicari
```

### AC-05.09: Menghapus Buku yang Sedang Dipinjam

- **Subtask:** [BE] DELETE guard: tolak bila ada peminjaman belum "Sudah Dikembalikan" (Q-11).

```gherkin
Given saya seorang Admin Perpus
  And berada di halaman Master Buku
  And buku tersebut masih memiliki peminjaman yang belum berstatus "Sudah Dikembalikan"
  Or termasuk "Pending Peminjaman" (guard Q-11)
When saya menekan icon Hapus pada buku tersebut
  And menekan OK pada alert rekonfirmasi
Then tampil pesan error: "Buku tidak dapat dihapus karena masih dipinjam"
  And buku tidak terhapus
```
