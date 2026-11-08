**Version:** 1.1
**Date:** 2026-11-08
**Author:** Tech Lead
**Status:** Current grooming baseline
**Phase:** Business

# Acceptance Criteria Addendum - ReadOnly

Addendum ini memuat 27 AC yang ditambahkan pada spreadsheet hasil grooming terbaru. Gunakan teks UI di bawah secara verbatim. Rundown PM memakai satu sprint, tetapi AC dalam addendum ini belum dialokasikan ke sprint backlog atau kartu; pilihan scope/komitmen ditetapkan pada Sprint Planning. Tiga file breakdown sprint yang lama tetap menjadi traceability historis untuk 50 AC awal.

Sumber: [Doc_BA_ReadOnly_Versi 1 (Versi Revisi Adi)](https://docs.google.com/spreadsheets/d/13cAZkljeFtunPfI0eLJPtjLBEO8PaT1i2Qc0fxxaDZg/edit?gid=0#gid=0).

## US-05: Master Buku

### AC-05.10: Edit Buku dengan Genre yang Sudah Nonaktif

- **Given:** Admin berada di halaman Master Buku dan buku memakai genre berstatus `Nonaktif`.
- **When:** Admin membuka Edit lalu menyimpan tanpa mengubah genre.
- **Then:** Genre lama tetap terpilih dengan penanda `Nonaktif`; dropdown hanya menawarkan genre `Aktif` untuk pilihan baru; data buku berhasil disimpan dengan pesan `Buku berhasil diubah`.

## US-10: Reminder Batas Akhir Pinjaman

### AC-10.04: Pop Up Pengingat Batas Pengembalian 1 sampai 3 Hari Lagi

- **Given:** Member memiliki buku berstatus `Sedang Dipinjam` dengan batas pengembalian 1 sampai 3 hari lagi.
- **When:** Member berhasil login dan diarahkan ke Home.
- **Then:** Tampil popup `Batas pengembalian {sisa_hari} hari lagi` yang memuat judul buku dan tanggal batas pengembalian. Popup tertutup otomatis setelah 3 detik dan hanya tampil sekali setiap kali login.

### AC-10.05: Pop Up Pengingat Hari Jatuh Tempo

- **Given:** Member memiliki buku berstatus `Sedang Dipinjam` yang batas pengembaliannya hari ini.
- **When:** Member berhasil login dan diarahkan ke Home.
- **Then:** Tampil popup `{judul_buku} jatuh tempo hari ini. Silakan dikembalikan.` Popup tertutup otomatis setelah 3 detik dan hanya tampil sekali setiap kali login.

### AC-10.06: Pop Up Peringatan Buku Terlambat

- **Given:** Member memiliki buku berstatus `Terlambat`.
- **When:** Member berhasil login dan diarahkan ke Home.
- **Then:** Tampil popup `{judul_buku} terlambat {jumlah_hari} hari. Segera ajukan pengembalian.` Popup tertutup otomatis setelah 3 detik dan hanya tampil sekali setiap kali login.

### AC-10.07: Pop Up untuk Lebih dari Satu Kondisi

- **Given:** Member memiliki buku yang memenuhi lebih dari satu kondisi pada AC-10.04, AC-10.05, atau AC-10.06.
- **When:** Member berhasil login dan diarahkan ke Home.
- **Then:** Popup tampil bergantian selama 3 detik per popup, dengan urutan terlambat, jatuh tempo hari ini, lalu batas pengembalian 1 sampai 3 hari lagi. Satu popup memuat semua judul buku pada kondisi tersebut.

### AC-10.08: Menutup Pop Up Pengingat Lebih Cepat

- **Given:** Popup pengingat sedang tampil.
- **When:** Member menekan ikon tutup (X) sebelum 3 detik.
- **Then:** Popup tertutup dan popup berikutnya tampil jika masih ada. Pengingat tetap tersimpan di daftar notifikasi pada ikon Notifikasi.

## US-11: Master Genre (Admin Perpus)

### AC-11.01: Melihat Daftar Genre

Admin membuka menu `Master Genre`. Tampil daftar dengan kolom Nama Genre, Jumlah Buku, Status (`Aktif` / `Nonaktif`), dan Action (Edit, Aktifkan/Nonaktifkan, Hapus), tombol `Add`, serta kolom pencarian genre.

### AC-11.02: Menambahkan Genre Baru

Admin menambah genre dengan Nama Genre wajib. Sistem menampilkan `Genre berhasil ditambahkan`, kembali ke Master Genre, menyimpan genre berstatus `Aktif`, dan menyediakan genre itu di form Tambah/Edit Buku, halaman Pilih Genre, dan filter Genre.

### AC-11.03: Validasi Field Mandatory Genre

Admin menyimpan form Tambah atau Edit Genre tanpa Nama Genre. Data tidak tersimpan dan tampil pesan `Field harus diisi!` di bawah field.

### AC-11.04: Validasi Nama Genre Duplikat

Saat nama genre sama dengan genre lain setelah mengabaikan kapitalisasi dan spasi di awal/akhir, data tidak tersimpan dan tampil pesan `Genre sudah ada`.

### AC-11.05: Mengubah Nama Genre

Admin mengubah Nama Genre yang valid. Sistem menampilkan `Genre berhasil diubah`, kembali ke Master Genre, dan nama baru tampil pada buku, filter Genre, halaman Pilih Genre, serta preferensi genre Member yang memakai genre tersebut.

### AC-11.06: Menonaktifkan Genre

Admin menonaktifkan genre Aktif dan mengonfirmasi alert `Apakah Anda yakin menonaktifkan genre {nama_genre}?`. Sistem menampilkan `Genre berhasil dinonaktifkan`, mengubah status menjadi `Nonaktif`, dan menghapus genre dari pilihan baru di form Tambah/Edit Buku, halaman Pilih Genre, dan filter Genre. Buku serta preferensi Member yang sudah memakai genre itu tidak berubah.

### AC-11.07: Mengaktifkan Kembali Genre

Admin mengaktifkan genre Nonaktif. Sistem menampilkan `Genre berhasil diaktifkan`, mengubah status menjadi `Aktif`, dan menyediakan genre kembali di form Tambah/Edit Buku, halaman Pilih Genre, dan filter Genre.

### AC-11.08: Menghapus Genre yang Belum Digunakan

Admin menghapus genre yang tidak dipakai buku mana pun dan tidak dipilih Member mana pun, lalu mengonfirmasi alert `Apakah Anda yakin menghapus genre {nama_genre}?`. Sistem menampilkan `Genre berhasil dihapus` dan menghilangkan genre dari Master Genre.

### AC-11.09: Menghapus Genre yang Sudah Digunakan

Admin mencoba menghapus genre yang dipakai setidaknya satu buku atau dipilih setidaknya satu Member. Sistem menampilkan `Genre tidak dapat dihapus karena masih digunakan. Nonaktifkan genre jika tidak ingin dipakai lagi.` dan tidak menghapus genre.

### AC-11.10: Mencari Genre

Admin mencari berdasarkan keyword nama genre. Sistem hanya menampilkan nama yang mengandung keyword; bila tidak ada hasil, tampil `Genre tidak ditemukan`.

## US-12: Management User (Admin Perpus)

### AC-12.01: Melihat Daftar User

Admin membuka menu `Management User`. Tampil daftar dengan kolom Nama Lengkap, Email, Nomor Ponsel, Role (`Admin Perpus` / `Member`), Status (`Aktif` / `Nonaktif`), dan Action (Edit, Aktifkan/Nonaktifkan), tombol `Add Admin`, kolom pencarian, serta filter Role.

### AC-12.02: Menambahkan Akun Admin Baru

Admin menambah akun dengan Nama Lengkap, Email, Nomor Ponsel, Password, dan Konfirmasi Password yang wajib. Sistem menampilkan `Admin berhasil ditambahkan`, kembali ke Management User, menampilkan akun ber-role `Admin Perpus` dan status `Aktif`, serta mengizinkan akun login ke Dashboard.

### AC-12.03: Validasi Field Mandatory Akun

Admin menyimpan form Tambah Admin atau Edit User dengan field wajib kosong. Data tidak tersimpan dan setiap field kosong menampilkan `Field harus diisi!`.

### AC-12.04: Validasi Data Akun Admin

Admin mengisi email berformat salah, email yang sudah terdaftar, atau konfirmasi password yang berbeda. Data tidak tersimpan dan field terkait menampilkan `Format email salah`, `Email sudah terdaftar`, atau `Password harus sama`.

### AC-12.05: Mengubah Data User

Admin mengubah Nama Lengkap, Nomor Ponsel, atau Alamat (khusus Member). Sistem menampilkan `Data user berhasil diubah`, kembali ke Management User, dan menampilkan Email serta Role sebagai field yang tidak dapat diubah.

### AC-12.06: Menonaktifkan Akun User

Admin menonaktifkan user Aktif yang bukan dirinya sendiri dan tidak memiliki peminjaman aktif, lalu mengonfirmasi `Apakah Anda yakin menonaktifkan akun {nama_user}?`. Sistem menampilkan `Akun berhasil dinonaktifkan`, mengubah status menjadi `Nonaktif`, dan menolak login user tersebut.

### AC-12.07: Login dengan Akun Nonaktif

User berstatus Nonaktif mencoba login dengan email dan password yang benar. Sistem tetap di halaman Login dan menampilkan `Akun Anda tidak aktif. Silakan hubungi Admin Perpus.`

### AC-12.08: Mengaktifkan Kembali Akun User

Admin mengaktifkan user Nonaktif. Sistem menampilkan `Akun berhasil diaktifkan`, mengubah status menjadi `Aktif`, dan mengizinkan user login kembali.

### AC-12.09: Admin Tidak Dapat Menonaktifkan Akunnya Sendiri

Pada baris akun Admin yang sedang login, tombol `Nonaktifkan` dalam kondisi disable.

### AC-12.10: Menonaktifkan Member yang Masih Meminjam

Admin mencoba menonaktifkan Member yang memiliki pinjaman belum berstatus `Sudah Dikembalikan`. Sistem menampilkan `Akun tidak dapat dinonaktifkan karena masih memiliki peminjaman aktif` dan mempertahankan status `Aktif`.

### AC-12.11: Mencari dan Memfilter User

Admin mencari berdasarkan nama atau email atau memilih filter Role. Sistem menampilkan user yang cocok; bila tidak ada hasil, tampil `User tidak ditemukan`.

## Catatan sinkronisasi

- Tambahan: 1 AC untuk US-05, 5 AC untuk US-10, 10 AC untuk US-11, dan 11 AC untuk US-12. Total tambahan: 27 AC.
- Total baseline terbaru: 77 AC. Belum ada daftar AC yang committed untuk satu sprint; 27 AC tambahan belum dipecah menjadi task/PIC.
- Sumber ini mengubah persona US-08 dan US-09 menjadi `Member, Admin`; lihat sheet User Story.
