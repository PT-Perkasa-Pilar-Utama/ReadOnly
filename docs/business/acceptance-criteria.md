**Version:** 1.1
**Date:** 2026-11-08
**Author:** Tech Lead
**Status:** Current backlog baseline
**Phase:** Business

# Acceptance Criteria Index

Baseline terbaru memuat 77 AC. Gherkin untuk 50 AC awal berada pada file yang bernama Sprint 1–3; alokasi tersebut historis dan bukan jadwal aktif. PM menetapkan cadence satu sprint, dengan scope dipilih saat Sprint Planning ([rundown](sprint-breakdown.md)). 27 AC terbaru berada di [acceptance-criteria-addendum.md](acceptance-criteria-addendum.md); jangan menganggap seluruh 77 AC committed dalam satu sprint.

- Alokasi historis Sprint 1 (23 AC): [acceptance-criteria-sprint-1.md](acceptance-criteria-breakdown/acceptance-criteria-sprint-1.md)
- Alokasi historis Sprint 2 (11 AC): [acceptance-criteria-sprint-2.md](acceptance-criteria-breakdown/acceptance-criteria-sprint-2.md)
- Alokasi historis Sprint 3 (16 AC): [acceptance-criteria-sprint-3.md](acceptance-criteria-breakdown/acceptance-criteria-sprint-3.md)
- Addendum grooming terbaru (27 AC): [acceptance-criteria-addendum.md](acceptance-criteria-addendum.md)

## US-01: Melakukan Register (Member baru)

### AC-01.01: Membuka Form Register
### AC-01.02: Register Berhasil
### AC-01.03: Validasi Field Mandatory Registrasi
### AC-01.04: Validasi Konfirmasi password harus sama
### AC-01.05: Validasi Format Email
### AC-01.06: Validasi Genre
### AC-01.07: Lanjut ke Halaman Pilih Genre
### AC-01.08: Validasi Email sudah Terdaftar

## US-02: Melakukan Login (All)

### AC-02.01: Login Berhasil
### AC-02.02: Login Gagal karena Password Salah
### AC-02.03: Login Gagal karena email Tidak Terdaftar
### AC-02.04: Validasi Field Mandatory Login
### AC-02.05: Login Berhasil sebagai Admin Perpus

## US-03: Melakukan Logout (All)

### AC-03.01: Melakukan logout

## US-04: Melihat Dashboard (Admin Perpus)

### AC-04.01: Melihat Dashboard

## US-05: Master Buku (Admin Perpus)

### AC-05.01: Menambahkan Buku Baru
### AC-05.02: Validasi Field Mandatory
### AC-05.03: Validasi Upload Cover Tidak sesuai Format
### AC-05.04: Validasi Ukuran Upload Cover melebihi Ketentuan
### AC-05.05: Mengubah Data Buku
### AC-05.06: Menghapus Data Buku
### AC-05.07: Memfilter buku berdasarkan Penulis dan Genre
### AC-05.08: Mencari buku berdasarkan Judul Buku, penulis, atau genre
### AC-05.09: Menghapus Buku yang Sedang Dipinjam
### AC-05.10: Edit Buku dengan Genre yang Sudah Nonaktif

## US-06: Manajemen Peminjaman (Admin Perpus)

### AC-06.01: Melihat Buku yang dipinjam
### AC-06.02: Melihat Buku yang berstatus Terlambat
### AC-06.03: Perubahan Status Otomatis menjadi Terlambat

## US-07: Melihat Buku (Member)

### AC-07.01: Membuka halaman Home
### AC-07.02: Memfilter buku berdasarkan Penulis dan Genre
### AC-07.03: Mencari buku berdasarkan Judul Buku, penulis, atau genre
### AC-07.04: Melihat Detail Buku

## US-08: Meminjam Buku (Member, Admin)

### AC-08.01: Mengajukan Peminjaman dari Halaman Detail Buku
### AC-08.02: Melakukan Konfirmasi Peminjaman ke Admin Perpus
### AC-08.03: Menyetujui Peminjaman Buku dengan QR Code
### AC-08.04: Buku Tidak Tersedia
### AC-08.05: Melihat Daftar Pinjaman Saya
### AC-08.06: Scan QR Code Tidak Valid

## US-09: Mengembalikan Buku (Member, Admin)

### AC-09.01: Mengembalikan Buku yang Dipinjam dengan status Sedang Dipinjam
### AC-09.02: Mengembalikan Buku yang Dipinjam dengan status Terlambat
### AC-09.03: Melakukan Konfirmasi Pengembalian untuk peminjaman berstatus Pending Pengembalian
### AC-09.04: Melakukan Konfirmasi Pembayaran Denda oleh Member berstatus Pending Keterlambatan
### AC-09.05: Melakukan Konfirmasi Pengembalian untuk member yang sudah membayar Denda
### AC-09.06: Validasi Rating Mandatory
### AC-09.07: Membatalkan Pengembalian di Pop Up Feedback
### AC-09.08: Input Biaya Denda untuk Keterlambatan 5 Hari atau Lebih
### AC-09.09: Validasi Input Biaya Denda
### AC-09.10: Membatalkan Input Biaya Denda

## US-10: Reminder Batas Akhir Pinjaman (Member)

### AC-10.01: Reminder Notifikasi Batas Akhir Peminjaman
### AC-10.02: Reminder Notifikasi 3 Hari sebelum Batas Pengembalian
### AC-10.03: Notifikasi Buku Melewati Batas Pengembalian
### AC-10.04: Pop Up Pengingat Batas Pengembalian 1 sampai 3 Hari Lagi
### AC-10.05: Pop Up Pengingat Hari Jatuh Tempo
### AC-10.06: Pop Up Peringatan Buku Terlambat
### AC-10.07: Pop Up untuk Lebih dari Satu Kondisi
### AC-10.08: Menutup Pop Up Pengingat Lebih Cepat

## US-11: Master Genre (Admin Perpus)

### AC-11.01: Melihat Daftar Genre
### AC-11.02: Menambahkan Genre Baru
### AC-11.03: Validasi Field Mandatory Genre
### AC-11.04: Validasi Nama Genre Duplikat
### AC-11.05: Mengubah Nama Genre
### AC-11.06: Menonaktifkan Genre
### AC-11.07: Mengaktifkan Kembali Genre
### AC-11.08: Menghapus Genre yang Belum Digunakan
### AC-11.09: Menghapus Genre yang Sudah Digunakan
### AC-11.10: Mencari Genre

## US-12: Management User (Admin Perpus)

### AC-12.01: Melihat Daftar User
### AC-12.02: Menambahkan Akun Admin Baru
### AC-12.03: Validasi Field Mandatory Akun
### AC-12.04: Validasi Data Akun Admin
### AC-12.05: Mengubah Data User
### AC-12.06: Menonaktifkan Akun User
### AC-12.07: Login dengan Akun Nonaktif
### AC-12.08: Mengaktifkan Kembali Akun User
### AC-12.09: Admin Tidak Dapat Menonaktifkan Akunnya Sendiri
### AC-12.10: Menonaktifkan Member yang Masih Meminjam
### AC-12.11: Mencari dan Memfilter User

Total: 77 AC (50 awal + 27 terbaru).
