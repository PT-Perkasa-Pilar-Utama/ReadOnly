**Version:** 0.1
**Date:** 2026-11-05
**Author:** Tech Lead
**Status:** Draft
**Phase:** Init

# ac_raw - Snapshot awal Acceptance Criteria

Arsip TSV ini merekam snapshot awal 50 AC dan belum mencakup 27 AC pada spreadsheet grooming terbaru. Gunakan [addendum AC](../business/acceptance-criteria-addendum.md) dan [grooming final](../decisions/2026-11-06-grooming-final.md) untuk baseline terkini. Sel multibaris pada snapshot diberi tanda kutip ganda.

## TSV

```tsv
AC	US	Scenario	GIVEN	WHEN	THEN
"AC-01.01"	"US-01"	"Membuka Form Register"	"saya adalah pengguna baru yang ingin mendafta
AND berada di halaman Login"	"saya menekan tombol Sign Up"	"tampil halaman form register
- field Nama lengkap (Mandatory)
- field Email (Mandatory)
- field Alamat (Mandatory)
- field Nomor Ponsel (Mandatory)
- field Password (Mandatory)
- field Konfirmasi Password (Mandatory)
AND tampil tombol \"Next\""
"AC-01.02"	"US-01"	"Register Berhasil"	"saya adalah pengguna baru yang ingin mendaftar
AND berada di halaman Register"	"saya mengisi form register dengan data yang valid
AND menekan tombol \"Next\"
AND memilih Genre yang diminati (terdiri dari beberapa genre dan bisa multitag), (Mandatory)
AND menekan tombol \"Daftar\""	"tampil pesan sukses: \"Akun berhasil dibuat\"
AND diarahkan ke halaman Login"
"AC-01.03"	"US-01"	"Validasi Field Mandatory Registrasi"	"saya adalah pengguna baru yang ingin mendaftar
AND berada di halaman Register"	"saya sengaja melanjutkan tanpa mengisi field mandatory
AND menekan tombol \"Daftar\""	"tampil pesan error dibawah field: \"Field harus diisi!\""
"AC-01.04"	"US-01"	"Validasi Konfirmasi password harus sama"	"saya adalah pengguna baru yang ingin mendaftar
AND berada di halaman Register"	"saya mengisi konfirmasi password tidak sama dengan password
AND menekan tombol \"Daftar\""	"tampil pesan error: \"Password harus sama\""
"AC-01.05"	"US-01"	"Validasi Format Email"	"saya adalah pengguna baru yang ingin mendaftar
AND berada di halaman Register"	"saya mengisi email tidak sesuai ketentuan (contoh, newmember.com)
AND menekan tombol \"Daftar\""	"tampil pesan error: \"Format email salah\""
"AC-01.06"	"US-01"	"Validasi Genre"	"saya adalah pengguna baru yang ingin mendaftar
AND berada di halaman Register"	"saya melanjutkan tanpa mengisi genre satupun
AND menekan tombol \"Daftar\""	"tampil pesan error: \"Pilih minimal 1 genre\""
"AC-01.07"	"US-01"	"Lanjut ke Halaman Pilih Genre"	"saya adalah pengguna baru yang ingin mendaftar
AND berada di halaman Register"	"saya mengisi semua field mandatory dengan data yang valid
AND menekan tombol \"Next\""	"diarahkan ke halaman Pilih Genre
AND tampil daftar genre yang bisa dipilih lebih dari 1 (multitag)
AND tampil tombol \"Daftar\""
"AC-01.08"	"US-01"	"Validasi Email sudah Terdaftar"	"saya adalah pengguna baru yang ingin mendaftar
AND berada di halaman Register"	"saya mengisi email yang sudah terdaftar (contoh: \"newmember@gmail.com\")
AND menekan tombol \"Next\""	"tetap berada di halaman Register
AND tampil pesan error di bawah field Email: \"Email sudah terdaftar\""
"AC-02.01"	"US-02"	"Login Berhasil"	"saya adalah pengguna terdaftar dengan email \"newmember@gmail.com\" dan password \"password\" 
AND berada di halaman Login"	"saya memasukkan \"newmember@gmail.com\" di kolom email
AND memasukkan \"password\" di kolom password
AND menekan tombol \"Login\""	"tampil pesan sukses: \"Login Berhasil\"
AND diarahkan ke halaman beranda
AND tampil nama saya (\"newmember@gmail.com\") ditampilkan di pojok kanan atas halaman"
"AC-02.02"	"US-02"	"Login Gagal karena Password Salah"	"saya adalah pengguna terdaftar dengan email = \"newmember@gmail.com\" dan password = \"password\"
AND berada di halaman Login"	"saya memasukkan email yang terdaftar misal \"newmember@gmail.com\" dan memasukkan password apapun
AND menekan tombol \"Login\""	"tetap berada di halaman Login
AND tampil pesan error \"email and Password tidak sama\""
"AC-02.03"	"US-02"	"Login Gagal karena email Tidak Terdaftar"	"saya adalah pengguna yang terdaftar
AND berada di halaman Login 
AND belum mendaftarkan email"	"saya memasukkan email yang tidak terdaftar misal \"gabriel@gmail.com\" dan memasukkan password apapun
AND menekan tombol \"Login\""	"tetap berada di halaman Login
AND tampil pesan error \"Email Not Registered\""
"AC-02.04"	"US-02"	"Validasi Field Mandatory Login"	"saya adalah pengguna terdaftar dengan email = \"newmember@gmail.com\" dan password = \"password\"
AND berada di halaman Login
AND field email dan password bersifat mandatory"	"saya tidak mengisi kolom email dan kolom password
AND menekan tombol \"Login\""	"tetap berada di halaman Login
AND melihat pesan validasi di bawah field email \"email tidak boleh kosong\" dan di bawah field password \"Password tidak boleh kosong\""
"AC-02.05"	"US-02"	"Login Berhasil sebagai Admin Perpus"	"saya adalah Admin Perpus yang terdaftar
AND berada di halaman Login"	"saya memasukkan email dan password Admin Perpus yang benar
AND menekan tombol \"Login\""	"tampil pesan sukses: \"Login Berhasil\"
AND diarahkan ke halaman Dashboard"
"AC-03.01"	"US-03"	"Melakukan logout"	"saya adalah pengguna yang terdaftar 
AND berada di halaman manapun"	"saya menekan tombol \"Logout\""	"diarahkan ke halaman Login"
"AC-04.01"	"US-04"	"Melihat Dashboard"	"saya login sebagai Admin Perpus"	"saya membuka halaman Dashboard"	"tampil metric informasi summary peminjaman seperti:
- total buku
- total ketersediaan buku
- total buku yang berstatus \"Sedang Dipinjam\"
- total buku yang berstatus Terlambat
- total buku yang berstatus Sudah Dikembalikan
- pie chart total buku yang dikembalikan tepat waktu dan terlambat"
"AC-05.01"	"US-05"	"Menambahkan Buku Baru"	"saya seorang Admin Perpus
AND berada di halaman Master Buku"	"saya menekan tombol \"Add\"
AND mengisi field informasi Buku:
- Upload Cover Buku (Mandatory), format file .png, .jpg, .jpeg, max 5Mb
- Judul Buku (Mandatory)
- Penulis (Mandatory)
- Penerbit (Mandatory)
- Tahun Terbit (Mandatory)
- Sinopsis (Mandatory)
- Genre (Mandatory)
- Jumlah Ketersediaan (Mandatory)
AND menekan tombol \"Save\""	"tampil pesan sukses: \"Buku berhasil ditambahkan\"
AND diarahkan ke halaman Master Buku"
"AC-05.02"	"US-05"	"Validasi Field Mandatory"	"saya seorang Admin Perpus
AND berada di halaman Master Buku"	"saya tidak mengisi field mandatory
AND menekan tombol \"Save\""	"tampil pesan error dibawah field: \"Field harus diisi!\""
"AC-05.03"	"US-05"	"Validasi Upload Cover Tidak sesuai Format"	"saya seorang Admin Perpus
AND berada di form penambahan master buku"	"saya mengupload cover buku tidak sesuai format
AND menekan tombol \"Save\""	"tampil pesan error: \"Format file cover buku tidak sesuai\""
"AC-05.04"	"US-05"	"Validasi Ukuran Upload Cover melebihi Ketentuan"	"saya seorang Admin Perpus
AND berada di form penambahan master buku"	"saya mengupload cover buku melebihi 5Mb
AND menekan tombol \"Save\""	"tampil pesan error: \"Ukuran file cover buku tidak boleh lebih dari 5Mb\""
"AC-05.05"	"US-05"	"Mengubah Data Buku"	"saya seorang Admin Perpus
AND berada di halaman Master Buku"	"saya menekan icon Edit pada salah satu buku
AND mengubah field Jumlah Ketersediaan Buku
AND menekan tombol \"Save\""	"tampil pesan sukses: \"Buku berhasil diubah\"
AND diarahkan ke halaman Master Buku"
"AC-05.06"	"US-05"	"Menghapus Data Buku"	"saya seorang Admin Perpus
AND berada di halaman Master Buku"	"saya menekan icon Hapus pada salah satu buku
AND menekan OK pada alert rekonfirmasi \"Apakah Anda yakin menghapus buku {judul_buku} ini?\""	"tampil pesan sukses: \"Buku berhasil dihapus\"
AND diarahkan kembali ke halaman Master Buku"
"AC-05.07"	"US-05"	"Memfilter buku berdasarkan Penulis dan Genre"	"saya seorang Admin Perpus
AND berada di halaman Master Buku"	"saya menekan icon Filter
AND memilih author (Dropdown)
OR memilih genre (Dropdown)
AND menekan tombol \"Set Filter\""	"hanya menampilkan buku sesuai filter yang dipilih
AND kolom Ketersediaan tetap menampilkan jumlah buku tersedia (contoh: \"3 tersedia\")"
"AC-05.08"	"US-05"	"Mencari buku berdasarkan Judul Buku, penulis, atau genre"	"saya seorang Admin Perpus
AND berada di halaman Master Buku"	"saya mengetikkan keyword judul buku/penulis/genre"	"hanya menampilkan buku sesuai keyword yang dicari"
"AC-05.09"	"US-05"	"Menghapus Buku yang Sedang Dipinjam"	"saya seorang Admin Perpus
AND berada di halaman Master Buku
AND buku tersebut masih memiliki peminjaman yang belum berstatus \"Sudah Dikembalikan\""	"saya menekan icon Hapus pada buku tersebut
AND menekan OK pada alert rekonfirmasi"	"tampil pesan error: \"Buku tidak dapat dihapus karena masih dipinjam\"
AND buku tidak terhapus"
"AC-06.01"	"US-06"	"Melihat Buku yang dipinjam"	"saya login sebagai Admin Perpus"	"saya membuka halaman Manajemen Peminjaman"	"tampil daftar buku yang dipinjam beserta nama peminjam
AND status buku yang dipinjam seperti
- \"Sedang Dipinjam\": sedang dalam masa pinjaman (range 7 hari after konfirmasi)
- \"Terlambat\": > masa pinjaman (diatas 7 hari)
- \"Pending Pengembalian\": mengajukan pengembalian dalam masa peminjaman
- \"Pending Keterlambatan\": mengajukan pengembalian > masa pinjaman"
"AC-06.02"	"US-06"	"Melihat Buku yang berstatus Terlambat"	"saya seorang Admin Perpus
AND berada di halaman Manajemen Peminjaman
AND terdapat buku yang berstatus \"Terlambat\""	"saya menekan icon detail pada buku yang berstatus \"Terlambat\""	"tampil informasi detail buku yang dipinjam seperti
- Cover
- Judul Buku
- Penulis
- Penerbit
- Tahun Terbit
- Sinopsis
- Genre
- Peminjam
- Keterlambatan (days)
- Total Denda
AND Total Denda dihitung otomatis oleh sistem:
- terlambat 1–4 hari: Rp 2.000 (flat)
- terlambat ≥ 5 hari: Biaya Denda dan Total Denda belum terisi sampai Admin menginput biaya denda secara manual saat pembayaran denda (lihat AC-09.08)"
"AC-06.03"	"US-06"	"Perubahan Status Otomatis menjadi Terlambat"	"terdapat peminjaman berstatus \"Sedang Dipinjam\"
AND tanggal hari ini sudah melewati Batas Pengembalian (7 hari setelah konfirmasi peminjaman)"	"sistem melakukan pengecekan status peminjaman harian"	"status peminjaman berubah menjadi \"Terlambat\" di halaman Pinjaman member dan halaman Manajemen Peminjaman
AND Keterlambatan (hari) dan Total Denda mulai dihitung sesuai AC-06.02"
"AC-07.01"	"US-07"	"Membuka halaman Home"	"saya berhasil login sebagai member"	"sistem mengarahkan saya ke halaman Home
OR saya menekan menu Home"	"tampil rekomendasi buku berdasarkan referensi genre yang telah dipilih pada halaman register
AND tampil semua buku yang tersedia diperpustakaan"
"AC-07.02"	"US-07"	"Memfilter buku berdasarkan Penulis dan Genre"	"saya seorang member
AND berada di halaman Home"	"saya menekan icon Filter
AND memilih author (Dropdown)
OR memilih genre (Dropdown)
AND menekan tombol \"Set Filter\""	"hanya menampilkan buku sesuai filter yang dipilih
AND setiap buku tetap menampilkan label \"Tersedia\" / \"Tidak Tersedia\""
"AC-07.03"	"US-07"	"Mencari buku berdasarkan Judul Buku, penulis, atau genre"	"saya seorang member
AND berada di halaman Home"	"saya mengetikkan keyword judul buku/penulis/genre"	"hanya menampilkan buku sesuai keyword yang dicari"
"AC-07.04"	"US-07"	"Melihat Detail Buku"	"saya seorang member 
AND berada di halaman Home"	"saya menekan icon Detail pada salah satu buku"	"tampil Detail informasi buku seperti
- Cover
- Judul Buku
- Penulis
- Penerbit
- Tahun Terbit
- Sinopsis
- Genre
- Ketersediaan Buku
AND tampil tombol \"Pinjam\" (lihat AC-08.01)"
"AC-08.01"	"US-08"	"Mengajukan Peminjaman dari Halaman Detail Buku"	"saya seorang member
AND berada di halaman Detail Buku
AND Ketersediaan Buku berstatus \"Tersedia\""	"saya menekan tombol \"Pinjam\""	"tampil pesan sukses: \"Pengajuan peminjaman berhasil\"
AND diarahkan ke halaman Pinjaman
AND buku tampil dengan status \"Pending Peminjaman\" beserta tombol \"QR\""
"AC-08.02"	"US-08"	"Melakukan Konfirmasi Peminjaman ke Admin Perpus"	"saya seorang member
AND berada di halaman Pinjaman
AND terdapat buku yang berstatus \"Pending Peminjaman\""	"saya menekan tombol \"QR\" pada buku yang berstatus \"Pending Peminjaman\""	"tampil pop up \"QR Code Peminjaman\"
AND ditunjukkan ke Admin Perpus untuk di scan dan dikonfirmasi"
"AC-08.03"	"US-08"	"Menyetujui Peminjaman Buku dengan QR Code"	"saya seorang Admin perpus
AND berada di halaman Dashboard
AND terdapat member yang ingin mengonfirmasi peminjaman buku"	"saya menekan tombol \"Scan QR\"
AND tampil pop up Scan QR Code dan saya melakukan scanning QR Code
AND tampil pop up \"Konfirmasi Peminjaman\" berisi:
- Detail Peminjam: Nama Peminjam, Tanggal Permintaan, Durasi Peminjaman (7 hari)
- Detail Buku: Cover, Judul Buku, Penulis, Penerbit, Tahun Terbit, Genre
AND menekan tombol \"Konfirmasi Peminjaman\""	"tampil pesan sukses: \"Buku berhasil Dipinjam\"
AND sistem mengurangi jumlah ketersediaan buku
AND status buku di halaman Pinjaman akun member berubah menjadi \"Sedang Dipinjam\""
"AC-08.04"	"US-08"	"Buku Tidak Tersedia"	"saya seorang member
AND berada di halaman Detail Buku
AND Ketersediaan Buku berstatus \"Tidak Tersedia\" (0 buku)"	"saya melihat tombol \"Pinjam\""	"tombol \"Pinjam\" dalam kondisi disable"
"AC-08.05"	"US-08"	"Melihat Daftar Pinjaman Saya"	"saya login sebagai member"	"saya membuka halaman Pinjaman"	"tampil daftar peminjaman saya berisi Cover, Judul Buku, Penulis, Nomor Pinjaman, Tanggal permintaan (untuk \"Pending Peminjaman\") atau Batas pengembalian (status lainnya), dan Status
AND tampil aksi sesuai status:
- tombol \"QR\" untuk \"Pending Peminjaman\"
- tombol \"Kembalikan\" untuk \"Sedang Dipinjam\" dan \"Terlambat\"
- keterangan \"Menunggu admin\" untuk \"Pending Pengembalian\" dan \"Pending Keterlambatan\"
- keterangan \"Selesai\" untuk \"Sudah Dikembalikan\""
"AC-08.06"	"US-08"	"Scan QR Code Tidak Valid"	"saya seorang Admin perpus
AND pop up Scan QR Code sedang tampil"	"saya melakukan scanning QR Code yang tidak valid atau peminjamannya sudah dikonfirmasi sebelumnya"	"tampil pesan error: \"QR Code tidak valid\"
AND status peminjaman dan jumlah ketersediaan buku tidak berubah"
"AC-09.01"	"US-09"	"Mengembalikan Buku yang Dipinjam dengan status Sedang Dipinjam"	"saya seorang member
AND berada di halaman Pinjaman
AND ingin mengembalikan Buku dengan status peminjaman \"Sedang Dipinjam\""	"saya menekan tombol \"Kembalikan\"
AND tampil pop up \"Feedback Buku\"
AND saya memberi rating 1–5 bintang terhadap buku yang telah dipinjam (Mandatory)
AND menekan tombol \"Submit\""	"status peminjaman buku berubah menjadi \"Pending Pengembalian\" dengan keterangan \"Menunggu admin\"
AND diarahkan ke halaman Pinjaman
AND jika rating buku > 3 bintang, buku masuk ke section rekomendasi"
"AC-09.02"	"US-09"	"Mengembalikan Buku yang Dipinjam dengan status Terlambat"	"saya seorang member
AND berada di halaman Pinjaman
AND ingin mengembalikan Buku dengan status peminjaman \"Terlambat\""	"saya menekan tombol \"Kembalikan\"
AND tampil pop up \"Feedback Buku\"
AND saya memberi rating 1–5 bintang terhadap buku yang telah dipinjam (Mandatory)
AND menekan tombol \"Submit\""	"status peminjaman buku menjadi \"Pending Keterlambatan\" dengan keterangan \"Menunggu admin\"
AND diarahkan ke halaman Pinjaman
AND jika rating buku > 3 bintang, buku masuk ke section rekomendasi"
"AC-09.03"	"US-09"	"Melakukan Konfirmasi Pengembalian untuk peminjaman berstatus Pending Pengembalian"	"saya seorang Admin perpus
AND berada di halaman Manajemen Peminjaman
AND terdapat member yang ingin mengonfirmasi pengembalian buku dengan status \"Pending Pengembalian\""	"saya menekan icon detail pada buku yang sudah dipinjam user 
AND menekan tombol \"Konfirmasi Pengembalian\" pada dibawah informasi detail buku
AND menekan OK pada alert rekonfirmasi \"Apakah Anda Yakin {member_name} telah mengembalikan Buku?\""	"tampil pesan sukses: \"Buku berhasil Dikembalikan\"
AND sistem menambah jumlah ketersediaan buku
AND status buku di halaman Pinjaman dan halaman Manajemen Peminjaman berubah menjadi \"Sudah Dikembalikan\""
"AC-09.04"	"US-09"	"Melakukan Konfirmasi Pembayaran Denda oleh Member berstatus Pending Keterlambatan"	"saya seorang Admin perpus
AND berada di Manajemen Peminjaman
AND terdapat peminjaman yang berstatus \"Pending Keterlambatan\""	"saya menekan icon Detail pada peminjaman yang berstatus \"Pending Keterlambatan\"
AND melihat keterangan nominal denda sesuai perhitungan sebelumnya
AND melihat berapa lama keterlambatan ( in days)
AND melihat tombol \"Konfirmasi Pengembalian\" bersifat disable, tombol \"Pembayaran Denda\" enable
AND saya menekan tombol \"Pembayaran Denda\"
AND menekan OK pada alert rekonfirmasi \"Denda {member_name} adalah {total_denda}. Apakah benar telah dibayar?\""	"tampil pesan sukses: \"Denda Berhasil Dibayar\"
AND tombol \"Konfirmasi Pengembalian\" menjadi Enable
AND tombol \"Pembayaran Denda\" menjadi Disable"
"AC-09.05"	"US-09"	"Melakukan Konfirmasi Pengembalian untuk member yang sudah membayar Denda"	"saya seorang Admin perpus
AND berada di halaman detail salah satu buku dengan status \"Pending Keterlambatan\"
AND member sudah membayar denda"	"saya menekan tombol \"Konfirmasi Pengembalian\" pada dibawah informasi detail buku
AND menekan OK pada alert rekonfirmasi \"Apakah Anda Yakin {member_name} telah mengembalikan Buku?\""	"tampil pesan sukses: \"Buku berhasil Dikembalikan\"
AND sistem menambah jumlah ketersediaan buku
AND status buku di halaman Pinjaman akun member berubah menjadi \"Sudah Dikembalikan\"
AND diarahkan kembali ke halaman Manajemen Peminjaman"
"AC-09.06"	"US-09"	"Validasi Rating Mandatory"	"saya seorang member
AND pop up \"Feedback Buku\" sedang tampil"	"saya tidak memberi rating
AND menekan tombol \"Submit\""	"pop up tetap tampil
AND tampil pesan error: \"Rating wajib diisi\"
AND status peminjaman tidak berubah"
"AC-09.07"	"US-09"	"Membatalkan Pengembalian di Pop Up Feedback"	"saya seorang member
AND pop up \"Feedback Buku\" sedang tampil"	"saya menekan tombol \"Batal\" atau icon tutup (X)"	"pop up tertutup
AND status peminjaman tidak berubah"
"AC-09.08"	"US-09"	"Input Biaya Denda untuk Keterlambatan 5 Hari atau Lebih"	"saya seorang Admin Perpus
AND berada di halaman Detail Peminjaman berstatus \"Pending Keterlambatan\"
AND keterlambatan ≥ 5 hari
AND Biaya Denda dan Total Denda belum terisi"	"saya menekan tombol \"Pembayaran Denda\"
AND tampil pop up \"Biaya Denda\" berisi:
- Detail Peminjam: Nama Peminjam, Durasi Keterlambatan
- Detail Buku: Cover, Nama Buku, Penulis, Penerbit, Tahun Terbit, Genre
- field Biaya Denda (Mandatory, angka)
AND saya mengisi Biaya Denda
AND menekan tombol \"Submit\""	"pop up tertutup
AND tampil pesan sukses: \"Denda Berhasil Dibayar\"
AND Biaya Denda dan Total Denda di bagian Detail Denda terisi sesuai nominal yang diinput
AND Status Pembayaran berubah menjadi \"Sudah Bayar\"
AND tombol \"Konfirmasi Pengembalian\" menjadi enable
AND tombol \"Pembayaran Denda\" menjadi disable (lanjut ke AC-09.05)"
"AC-09.09"	"US-09"	"Validasi Input Biaya Denda"	"saya seorang Admin Perpus
AND pop up \"Biaya Denda\" sedang tampil"	"saya tidak mengisi field Biaya Denda atau mengisinya dengan selain angka
AND menekan tombol \"Submit\""	"pop up tetap tampil
AND tampil pesan error di bawah field Biaya Denda: \"Biaya denda wajib diisi dengan angka\"
AND Status Pembayaran tidak berubah"
"AC-09.10"	"US-09"	"Membatalkan Input Biaya Denda"	"saya seorang Admin Perpus
AND berada di halaman Detail Peminjaman berstatus \"Pending Keterlambatan\"
AND keterlambatan ≥ 5 hari
AND Biaya Denda dan Total Denda belum terisi"	"saya menekan tombol \"Batal\" atau icon tutup (X)"	"pop up tertutup
AND Biaya Denda, Total Denda, dan Status Pembayaran tidak berubah"
"AC-10.01"	"US-10"	"Reminder Notifikasi Batas Akhir Peminjaman"	"saya seorang member
AND berada di halaman Home
AND terdapat buku yang belum dikembalikan hingga batas waktu peminjaman"	"saya menekan icon Notifikasi"	"tampil notifikasi \"{judul_buku} sudah mencapai tenggat waktu peminjaman. Silahkan Dikembalikan\""
"AC-10.02"	"US-10"	"Reminder Notifikasi 3 Hari sebelum Batas Pengembalian"	"saya seorang member
AND terdapat buku berstatus \"Sedang Dipinjam\" yang batas pengembaliannya 3 hari lagi"	"saya menekan icon Notifikasi"	"tampil notifikasi \"Batas pengembalian 3 hari lagi\" dengan keterangan \"{judul_buku} perlu dikembalikan paling lambat {tanggal_batas_pengembalian}.\""
"AC-10.03"	"US-10"	"Notifikasi Buku Melewati Batas Pengembalian"	"saya seorang member
AND terdapat buku yang berstatus \"Terlambat\""	"saya menekan icon Notifikasi"	"tampil notifikasi \"Buku melewati batas pengembalian\" dengan keterangan \"{judul_buku} jatuh tempo pada {tanggal_batas_pengembalian}. Segera ajukan pengembalian.\""
```

## Catatan sel di luar tabel

| AC | Sel | Isi |
| --- | --- | --- |
| AC-06.02 | H27 | masih perlu ac buat isi yang lebih dari 5 hari |

Catatan H27 pada AC-06.02 berada di luar tabel AC (kolom H, setelah kolom THEN). Ditutup oleh kehadiran AC-09.08 sampai AC-09.10 (Q-34).
