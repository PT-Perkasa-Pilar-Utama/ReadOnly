**Version:** 0.1
**Date:** 2026-11-05
**Author:** Tech Lead
**Status:** Draft
**Phase:** Product Discovery

# Requirements Draft - ReadOnly

> **Riwayat, bukan baseline aktif.** Ruang lingkup yang berlaku adalah 12 US dan 77 AC pada [grooming final 6 November 2026](2026-11-06-grooming-final.md). Dokumen ini merekam draft 5 November dan belum memuat tambahan US-11, US-12, atau 27 AC terbaru.

Turunan dari sheet Product Overview, User Story, dan Acceptance Criteria; rencana sprint dan aritmetika kapasitas dari analisis estimasi. Semua nilai bertanda `[ASSUMED Q-NN]` atau `[COPY-TBD Q-NN]` adalah asumsi engineering yang menunggu persetujuan BA.

## 1. Product Overview

| Field | Value |
| --- | --- |
| Nama Fitur/Modul | ReadOnly |
| Tujuan Bisnis | Mendigitalisasi dan mengotomatisasi administrasi peminjaman buku |
| Persona Utama | Admin Perpus, Member |
| Problem Statement | Proses manajemen perpustakaan konvensional masih mengandalkan pencatatan manual yang rentan terhadap kesalahan (human error), seperti hilangnya data peminjaman, sulitnya melacak ketersediaan buku secara real-time, tidak adanya sistem pengingat otomatis bagi peminjam |
| Solution Overview | Membangun platform digital "ReadOnly" yang menyediakan katalog buku online yang mudah diakses, sistem manajemen inventaris buku (Master Buku), fitur peminjaman dan pengembalian mandiri bagi member, serta sistem notifikasi otomatis untuk pengingat batas waktu guna meminimalisir keterlambatan |

## 2. User Stories

| ID | Persona | Action | Business value |
| --- | --- | --- | --- |
| US-01 | Member baru | Melakukan registrasi akun member baru | bisa mendapatkan akses penuh ke platform perpustakaan digital. |
| US-02 | All | Melakukan login ke dalam sistem | dapat masuk sesuai hak akses saya dan data saya tersimpan dengan aman. |
| US-03 | All | Melakukan logout dari sistem | sesi berakhir dan akun saya tetap aman dari akses orang lain |
| US-04 | Admin Perpus | Melihat summary peminjaman buku | bisa mendapatkan informasi keseluruhan mengenai ketersediaan buku, peminjaman buku, keterlambatan pengembalian |
| US-05 | Admin Perpus | Mengelola master data buku (Tambah, Edit, Hapus) | katalog buku selalu terbarui, akurat, dan dapat dilihat oleh member dengan benar |
| US-06 | Admin Perpus | Mengelola manajemen transaksi peminjaman | status ketersediaan buku dan riwayat peminjaman setiap member tercatat dengan rapi |
| US-07 | Member | Melihat daftar dan detail buku yang tersedia | dapat mencari dan memilih buku yang saya butuhkan sebelum melakukan peminjaman |
| US-08 | Member | Melakukan proses peminjaman buku secara mandiri | dapat memesan buku yang diinginkan dengan cepat tanpa harus mengantre lama |
| US-09 | Member | Melakukan konfirmasi pengembalian buku | tanggung jawab peminjaman saya selesai dan saya terhindar dari akumulasi denda yang berlebih |
| US-10 | Member | Menerima notifikasi pengingat batas akhir pinjaman | dapat mengembalikan buku tepat waktu dan tidak terkena denda keterlambatan |

## 3. Acceptance Criteria (tingkat scenario)

50 AC dirinci per US di `docs/business/acceptance-criteria.md`. Rincian scenario kunci:

| AC ID | US | Scenario | Expected outcome |
| --- | --- | --- | --- |
| AC-01.01 | US-01 | Membuka Form Register | Form register tampil dengan 6 field mandatory dan tombol "Next" |
| AC-01.02 | US-01 | Register Berhasil | Pesan "Akun berhasil dibuat", diarahkan ke halaman Login |
| AC-01.03 | US-01 | Validasi Field Mandatory Registrasi | Pesan "Field harus diisi!" |
| AC-01.04 | US-01 | Validasi Konfirmasi password harus sama | Pesan "Password harus sama" |
| AC-01.05 | US-01 | Validasi Format Email | Pesan "Format email salah" |
| AC-01.06 | US-01 | Validasi Genre | Pesan "Pilih minimal 1 genre" |
| AC-01.07 | US-01 | Lanjut ke Halaman Pilih Genre | Halaman Pilih Genre tampil, genre multitag, tombol "Daftar" |
| AC-01.08 | US-01 | Validasi Email sudah Terdaftar | Tetap di halaman Register, pesan "Email sudah terdaftar" |
| AC-02.01 | US-02 | Login Berhasil | Pesan "Login Berhasil", ke beranda, nama di pojok kanan atas |
| AC-02.02 | US-02 | Login Gagal karena Password Salah | Tetap di Login, pesan "email and Password tidak sama" |
| AC-02.03 | US-02 | Login Gagal karena email Tidak Terdaftar | Tetap di Login, pesan "Email Not Registered" |
| AC-02.04 | US-02 | Validasi Field Mandatory Login | Pesan "email tidak boleh kosong" dan "Password tidak boleh kosong" |
| AC-02.05 | US-02 | Login Berhasil sebagai Admin Perpus | Pesan "Login Berhasil", ke halaman Dashboard |
| AC-03.01 | US-03 | Melakukan logout | Diarahkan ke halaman Login |
| AC-04.01 | US-04 | Melihat Dashboard | 5 metric + pie chart tepat waktu vs terlambat |
| AC-05.01 | US-05 | Menambahkan Buku Baru | Pesan "Buku berhasil ditambahkan", cover max 5Mb |
| AC-05.02 | US-05 | Validasi Field Mandatory | Pesan "Field harus diisi!" |
| AC-05.03 | US-05 | Validasi Upload Cover Tidak sesuai Format | Pesan "Format file cover buku tidak sesuai" |
| AC-05.04 | US-05 | Validasi Ukuran Upload Cover melebihi Ketentuan | Pesan "Ukuran file cover buku tidak boleh lebih dari 5Mb" |
| AC-05.05 | US-05 | Mengubah Data Buku | Pesan "Buku berhasil diubah" |
| AC-05.06 | US-05 | Menghapus Data Buku | Pesan "Buku berhasil dihapus" |
| AC-05.07 | US-05 | Memfilter buku berdasarkan Penulis dan Genre | Hanya buku sesuai filter, kolom Ketersediaan tetap muncul |
| AC-05.08 | US-05 | Mencari buku berdasarkan Judul Buku, penulis, atau genre | Hanya buku sesuai keyword |
| AC-05.09 | US-05 | Menghapus Buku yang Sedang Dipinjam | Pesan "Buku tidak dapat dihapus karena masih dipinjam" |
| AC-06.01 | US-06 | Melihat Buku yang dipinjam | Daftar dengan 4 status |
| AC-06.02 | US-06 | Melihat Buku yang berstatus Terlambat | Detail + Total Denda; 1–4 hari Rp 2.000 flat, ≥5 hari input manual |
| AC-06.03 | US-06 | Perubahan Status Otomatis menjadi Terlambat | Job harian ubah status + hitung denda |
| AC-07.01 | US-07 | Membuka halaman Home | Rekomendasi genre + daftar semua buku |
| AC-07.02 | US-07 | Memfilter buku berdasarkan Penulis dan Genre | Label "Tersedia" / "Tidak Tersedia" tetap muncul |
| AC-07.03 | US-07 | Mencari buku berdasarkan Judul Buku, penulis, atau genre | Hanya buku sesuai keyword |
| AC-07.04 | US-07 | Melihat Detail Buku | Detail buku lengkap + tombol "Pinjam" |
| AC-08.01 | US-08 | Mengajukan Peminjaman dari Halaman Detail Buku | Pesan "Pengajuan peminjaman berhasil", status "Pending Peminjaman" + tombol "QR" |
| AC-08.02 | US-08 | Melakukan Konfirmasi Peminjaman ke Admin Perpus | Pop up "QR Code Peminjaman" |
| AC-08.03 | US-08 | Menyetujui Peminjaman Buku dengan QR Code | Pesan "Buku berhasil Dipinjam", stok berkurang, status "Sedang Dipinjam" |
| AC-08.04 | US-08 | Buku Tidak Tersedia | Tombol "Pinjam" disable |
| AC-08.05 | US-08 | Melihat Daftar Pinjaman Saya | Daftar lengkap + aksi per status |
| AC-08.06 | US-08 | Scan QR Code Tidak Valid | Pesan "QR Code tidak valid", tidak ada perubahan |
| AC-09.01 | US-09 | Mengembalikan Buku yang Dipinjam dengan status Sedang Dipinjam | Status "Pending Pengembalian", rating >3 ke rekomendasi |
| AC-09.02 | US-09 | Mengembalikan Buku yang Dipinjam dengan status Terlambat | Status "Pending Keterlambatan", rating >3 ke rekomendasi |
| AC-09.03 | US-09 | Melakukan Konfirmasi Pengembalian | Pesan "Buku berhasil Dikembalikan", stok bertambah |
| AC-09.04 | US-09 | Konfirmasi Pembayaran Denda Pending Keterlambatan | Alert rekonfirmasi denda, tombol konfirmasi enable |
| AC-09.05 | US-09 | Konfirmasi Pengembalian member yang sudah bayar denda | Pesan "Buku berhasil Dikembalikan", stok bertambah |
| AC-09.06 | US-09 | Validasi Rating Mandatory | Pesan "Rating wajib diisi" |
| AC-09.07 | US-09 | Membatalkan Pengembalian di Pop Up Feedback | Pop up tertutup, status tidak berubah |
| AC-09.08 | US-09 | Input Biaya Denda 5 Hari atau Lebih | Pop up "Biaya Denda", status Pembayaran "Sudah Bayar" |
| AC-09.09 | US-09 | Validasi Input Biaya Denda | Pesan "Biaya denda wajib diisi dengan angka" |
| AC-09.10 | US-09 | Membatalkan Input Biaya Denda | Pop up tertutup, tidak ada perubahan |
| AC-10.01 | US-10 | Reminder Notifikasi Batas Akhir Peminjaman | Notifikasi tenggat waktu |
| AC-10.02 | US-10 | Reminder 3 Hari sebelum Batas Pengembalian | Notifikasi 3 hari lagi |
| AC-10.03 | US-10 | Notifikasi Buku Melewati Batas Pengembalian | Notifikasi "Buku melewati batas pengembalian" |

## 4. Sprint Breakdown

### Sprint 1: Fondasi, Autentikasi, dan Master Buku - 23 AC (US-01, US-02, US-03, US-05)

Tujuan: menyediakan akun member/admin, sesi, dan data buku sehingga seluruh alur lain dapat berjalan.

Alasan urutan: Akun, sesi, dan data buku adalah prasyarat semua alur lain; tanpa register/login dan Master Buku, katalog, peminjaman, dan dashboard tidak dapat diuji.

Dependensi lintas sprint: Sprint 2 memerlukan buku (Sprint 1) untuk ditampilkan dan dipinjam; Sprint 3 memerlukan peminjaman aktif yang telah dibuat di Sprint 2.

Kapasitas: BE 6.25 dev-day, FE 8.75 dev-day.

### Sprint 2: Katalog Member, Peminjaman dengan QR, dan Dashboard Admin - 11 AC (US-07, US-08, US-04)

Tujuan: member dapat menjelajah, mengajukan, dan memindai QR; admin dapat mengonfirmasi peminjaman lewat kamera browser.

Alasan urutan: Member memerlukan buku (Sprint 1) untuk dilihat dan dipinjam. Dashboard Admin masuk Sprint 2 karena tombol "Scan QR" berada di Dashboard (AC-08.03). Metrik Dashboard diuji dengan seed QA yang sudah memuat status lanjutan, sama seperti cara contoh menangani dependensi antar sprint.

Dependensi lintas sprint: Sprint 3 memerlukan peminjaman yang sudah ada (termasuk yang berstatus "Sedang Dipinjam" dan "Terlambat"). Rekomendasi berbasis rating (AC-09.01) baru hidup di Sprint 3; Home pada Sprint 2 hanya memakai rekomendasi genre (AC-07.01).

Kapasitas: BE 5.0 dev-day, FE 8.0 dev-day.

### Sprint 3: Manajemen Peminjaman, Pengembalian dan Denda, serta Reminder - 16 AC (US-06, US-09, US-10)

Tujuan: menyelesaikan siklus peminjaman - pengembalian, denda otomatis/manual, status otomatis, dan reminder notifikasi.

Alasan urutan: Pengembalian, denda, status otomatis, dan reminder bergantung pada peminjaman yang sudah ada, jadi masuk Sprint 3.

Dependensi lintas sprint: Semua dependensi masuk dari Sprint 2 (peminjaman aktif).

Kapasitas: BE 6.0 dev-day, FE 6.0 dev-day.

### Aritmetika kapasitas

Total: 17.25 (BE) + 22.75 (FE) = 40.0 dev-day. Kapasitas satu sprint dengan 1 BE dan 1 FE: 2 x 10 = 20 hari mentah, 2 x 8 = 16 hari produktif. Satu sprint tidak cukup (40.0 melawan 16 sampai 20). 40.0 / 16 = 2.5 sprint. FE adalah bottleneck: 22.75 / 8 = 2.84 sprint. Maka 3 sprint.

Utilisasi per sprint terhadap 8 hari produktif: BE 6.25, 5.0, 6.0; FE 8.75 (109%), 8.0, 6.0. FE Sprint 1 melebihi kapasitas 0.75 hari. Seimbangkan dengan slack BE: kartu TL dan DB, skema bersama di `packages/shared`, dan kartu wiring yang BE selesaikan terakhir.
