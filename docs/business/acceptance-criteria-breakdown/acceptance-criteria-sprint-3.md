# Acceptance Criteria: Sprint 3

> **Traceability historis:** file ini berisi alokasi awal 50 AC dalam rencana 3 sprint. Rujukan Sprint 3 di dalamnya hanya konteks lama, bukan jadwal atau komitmen PM. Lihat [rundown satu sprint](../sprint-breakdown.md); scope dipilih saat Sprint Planning.

**Sprint Focus:** Manajemen Peminjaman, Pengembalian dan Denda, serta Reminder
**Version:** 0.1
**Date:** 2026-11-05

## User Stories in Scope

> Catatan: breakdown ini tetap alokasi awal 50 AC. Persona US-09 mengikuti sheet terbaru (`Member, Admin`); kartu dan AC tetap dipisah per aktor.

- US-06: Manajemen Peminjaman (Admin Perpus) - 3 AC
- US-09: Mengembalikan Buku (Member, Admin) - 10 AC
- US-10: Reminder Batas Akhir Pinjaman (Member) - 3 AC

## US-06: Manajemen Peminjaman (Admin Perpus)

### AC-06.01: Melihat Buku yang dipinjam

> **Note:** Daftar halaman ini menampilkan lima status (semua kecuali "Pending Peminjaman") (Q-25).

```gherkin
Given saya login sebagai Admin Perpus
When saya membuka halaman Manajemen Peminjaman
Then tampil daftar buku yang dipinjam beserta nama peminjam
  And status buku yang dipinjam seperti
  - "Sedang Dipinjam": sedang dalam masa pinjaman (range 7 hari after konfirmasi)
  - "Terlambat": > masa pinjaman (diatas 7 hari)
  - "Pending Pengembalian": mengajukan pengembalian dalam masa peminjaman
  - "Pending Keterlambatan": mengajukan pengembalian > masa pinjaman
  Or lima status termasuk "Sudah Dikembalikan" (AC-09.03); "Pending Peminjaman" tidak tampil (Q-25).
```

### AC-06.02: Melihat Buku yang berstatus Terlambat

> **Note:** Denda otomatis 1–4 hari Rp 2.000 flat; ≥5 hari Biaya Denda dan Total Denda kosong sampai Admin input (Q-20/Q-21).

```gherkin
Given saya seorang Admin Perpus
  And berada di halaman Manajemen Peminjaman
  And terdapat buku yang berstatus "Terlambat"
When saya menekan icon detail pada buku yang berstatus "Terlambat"
Then tampil informasi detail buku yang dipinjam seperti
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
  And Total Denda dihitung otomatis oleh sistem:
  - terlambat 1–4 hari: Rp 2.000 (flat)
  Or `calculateFine(lateDays)` (Q-20).
  - terlambat ≥ 5 hari: Biaya Denda dan Total Denda belum terisi sampai Admin menginput biaya denda secara manual saat pembayaran denda (lihat AC-09.08)
```

### AC-06.03: Perubahan Status Otomatis menjadi Terlambat

> **Note:** Job harian, idempoten, Clock port injectable (Q-31).

```gherkin
Given terdapat peminjaman berstatus "Sedang Dipinjam"
  And tanggal hari ini sudah melewati Batas Pengembalian (7 hari setelah konfirmasi peminjaman)
When sistem melakukan pengecekan status peminjaman harian
  Or job harian di proses API (Q-31)
Then status peminjaman berubah menjadi "Terlambat" di halaman Pinjaman member dan halaman Manajemen Peminjaman
  And Keterlambatan (hari) dan Total Denda mulai dihitung sesuai AC-06.02
  Or late_days dibekukan saat pengajuan pengembalian (Q-19); job idempoten (Q-31).
```

## US-09: Mengembalikan Buku (Member, Admin)

### AC-09.01: Mengembalikan Buku yang Dipinjam dengan status Sedang Dipinjam

> **Note:** Rating > 3 masuk section rekomendasi (diinterpretasikan sebagai rata-rata rating buku > 3) (Q-27).

```gherkin
Given saya seorang member
  And berada di halaman Pinjaman
  And ingin mengembalikan Buku dengan status peminjaman "Sedang Dipinjam"
When saya menekan tombol "Kembalikan"
  And tampil pop up "Feedback Buku"
  And saya memberi rating 1–5 bintang terhadap buku yang telah dipinjam (Mandatory)
  And menekan tombol "Submit"
Then status peminjaman buku berubah menjadi "Pending Pengembalian" dengan keterangan "Menunggu admin"
  And diarahkan ke halaman Pinjaman
  And jika rating buku > 3 bintang, buku masuk ke section rekomendasi
  Or rata-rata rating buku > 3 (Q-27)
```

### AC-09.02: Mengembalikan Buku yang Dipinjam dengan status Terlambat

```gherkin
Given saya seorang member
  And berada di halaman Pinjaman
  And ingin mengembalikan Buku dengan status peminjaman "Terlambat"
When saya menekan tombol "Kembalikan"
  And tampil pop up "Feedback Buku"
  And saya memberi rating 1–5 bintang terhadap buku yang telah dipinjam (Mandatory)
  And menekan tombol "Submit"
Then status peminjaman buku menjadi "Pending Keterlambatan" dengan keterangan "Menunggu admin"
  And diarahkan ke halaman Pinjaman
  And jika rating buku > 3 bintang, buku masuk ke section rekomendasi
  Or rata-rata rating buku > 3 (Q-27)
```

### AC-09.03: Melakukan Konfirmasi Pengembalian untuk peminjaman berstatus Pending Pengembalian

- **Subtask:** [BE] POST `/admin/loans/:id/return-confirmation`; [FE] tombol "Konfirmasi Pengembalian".

```gherkin
Given saya seorang Admin perpus
  And berada di halaman Manajemen Peminjaman
  And terdapat member yang ingin mengonfirmasi pengembalian buku dengan status "Pending Pengembalian"
When saya menekan icon detail pada buku yang sudah dipinjam user
  And menekan tombol "Konfirmasi Pengembalian" pada dibawah informasi detail buku
  And menekan OK pada alert rekonfirmasi "Apakah Anda Yakin {member_name} telah mengembalikan Buku?"
Then tampil pesan sukses: "Buku berhasil Dikembalikan"
  And sistem menambah jumlah ketersediaan buku
  Or `available_count` increment atomik (Q-9)
  And status buku di halaman Pinjaman dan halaman Manajemen Peminjaman berubah menjadi "Sudah Dikembalikan"
```

### AC-09.04: Melakukan Konfirmasi Pembayaran Denda oleh Member berstatus Pending Keterlambatan

> **Note:** Untuk keterlambatan 1–4 hari: denda otomatis, alert rekonfirmasi "Denda {member_name} adalah {total_denda}. Apakah benar telah dibayar?" (Q-22).

```gherkin
Given saya seorang Admin perpus
  And berada di Manajemen Peminjaman
  And terdapat peminjaman yang berstatus "Pending Keterlambatan"
  Or keterlambatan 1–4 hari (nominal otomatis, Q-22)
When saya menekan icon Detail pada peminjaman yang berstatus "Pending Keterlambatan"
  And melihat keterangan nominal denda sesuai perhitungan sebelumnya
  And melihat berapa lama keterlambatan ( in days)
  And melihat tombol "Konfirmasi Pengembalian" bersifat disable, tombol "Pembayaran Denda" enable
  And saya menekan tombol "Pembayaran Denda"
  And menekan OK pada alert rekonfirmasi "Denda {member_name} adalah {total_denda}. Apakah benar telah dibayar?"
Then tampil pesan sukses: "Denda Berhasil Dibayar"
  And tombol "Konfirmasi Pengembalian" menjadi Enable
  And tombol "Pembayaran Denda" menjadi Disable
```

### AC-09.05: Melakukan Konfirmasi Pengembalian untuk member yang sudah membayar Denda

```gherkin
Given saya seorang Admin perpus
  And berada di halaman detail salah satu buku dengan status "Pending Keterlambatan"
  And member sudah membayar denda
  Or status Pembayaran "Sudah Bayar".
When saya menekan tombol "Konfirmasi Pengembalian" pada dibawah informasi detail buku
  And menekan OK pada alert rekonfirmasi "Apakah Anda Yakin {member_name} telah mengembalikan Buku?"
Then tampil pesan sukses: "Buku berhasil Dikembalikan"
  And sistem menambah jumlah ketersediaan buku
  Or `available_count` increment atomik (Q-9)
  And status buku di halaman Pinjaman akun member berubah menjadi "Sudah Dikembalikan"
  And diarahkan kembali ke halaman Manajemen Peminjaman
```

### AC-09.06: Validasi Rating Mandatory

```gherkin
Given saya seorang member
  And pop up "Feedback Buku" sedang tampil
When saya tidak memberi rating
  And menekan tombol "Submit"
Then pop up tetap tampil
  And tampil pesan error: "Rating wajib diisi"
  And status peminjaman tidak berubah
```

### AC-09.07: Membatalkan Pengembalian di Pop Up Feedback

- **Note:** Pembatalan tidak menyimpan rating (Q-27).

```gherkin
Given saya seorang member
  And pop up "Feedback Buku" sedang tampil
When saya menekan tombol "Batal" atau icon tutup (X)
Then pop up tertutup
  And status peminjaman tidak berubah
```

### AC-09.08: Input Biaya Denda untuk Keterlambatan 5 Hari atau Lebih

> **Note:** Pop up "Biaya Denda", input wajib angka, Status Pembayaran → "Sudah Bayar" (Q-22/Q-23).

```gherkin
Given saya seorang Admin Perpus
  And berada di halaman Detail Peminjaman berstatus "Pending Keterlambatan"
  And keterlambatan ≥ 5 hari
  And Biaya Denda dan Total Denda belum terisi
When saya menekan tombol "Pembayaran Denda"
  And tampil pop up "Biaya Denda" berisi:
  - Detail Peminjam: Nama Peminjam, Durasi Keterlambatan
  - Detail Buku: Cover, Nama Buku, Penulis, Penerbit, Tahun Terbit, Genre
  - field Biaya Denda (Mandatory, angka)
  And saya mengisi Biaya Denda
  And menekan tombol "Submit"
Then pop up tertutup
  And tampil pesan sukses: "Denda Berhasil Dibayar"
  And Biaya Denda dan Total Denda di bagian Detail Denda terisi sesuai nominal yang diinput
  And Status Pembayaran berubah menjadi "Sudah Bayar"
  And tombol "Konfirmasi Pengembalian" menjadi enable
  And tombol "Pembayaran Denda" menjadi disable (lanjut ke AC-09.05)
```

### AC-09.09: Validasi Input Biaya Denda

> **Note:** Batas atas input default 99.999.999; nominal harus bilangan bulat >= 1 (Q-20).

```gherkin
Given saya seorang Admin Perpus
  And pop up "Biaya Denda" sedang tampil
When saya tidak mengisi field Biaya Denda
  Or mengisinya dengan selain angka
  And menekan tombol "Submit"
Then pop up tetap tampil
  And tampil pesan error di bawah field Biaya Denda: "Biaya denda wajib diisi dengan angka"
  And Status Pembayaran tidak berubah
```

### AC-09.10: Membatalkan Input Biaya Denda

```gherkin
Given saya seorang Admin Perpus
  And berada di halaman Detail Peminjaman berstatus "Pending Keterlambatan"
  And keterlambatan ≥ 5 hari
  And Biaya Denda dan Total Denda belum terisi
When saya menekan tombol "Batal" atau icon tutup (X)
Then pop up tertutup
  And Biaya Denda, Total Denda, dan Status Pembayaran tidak berubah
```

## US-10: Reminder Batas Akhir Pinjaman (Member)

> **Note:** Tiga tipe notifikasi daftar: DUE_SOON_3D, DUE_TODAY, OVERDUE; unik per (peminjaman, tipe), in-app. Popup login AC-10.04–AC-10.08 dirinci di [addendum terbaru](../acceptance-criteria-addendum.md); Q-29 hanya terbuka untuk badge/tandai dibaca.

### AC-10.01: Reminder Notifikasi Batas Akhir Peminjaman

> **Note:** Tipe DUE_TODAY (pada tanggal batas, status masih "Sedang Dipinjam") (Q-30).

```gherkin
Given saya seorang member
  And berada di halaman Home
  And terdapat buku yang belum dikembalikan hingga batas waktu peminjaman
When saya menekan icon Notifikasi
Then tampil notifikasi "{judul_buku} sudah mencapai tenggat waktu peminjaman. Silahkan Dikembalikan"
```

### AC-10.02: Reminder Notifikasi 3 Hari sebelum Batas Pengembalian

> **Note:** Tipe DUE_SOON_3D (Q-30); format tanggal `{tanggal_batas_pengembalian}` default `d MMMM yyyy` ([COPY-TBD Q-36]).

```gherkin
Given saya seorang member
  And terdapat buku berstatus "Sedang Dipinjam" yang batas pengembaliannya 3 hari lagi
When saya menekan icon Notifikasi
Then tampil notifikasi "Batas pengembalian 3 hari lagi" dengan keterangan "{judul_buku} perlu dikembalikan paling lambat {tanggal_batas_pengembalian}."
```

### AC-10.03: Notifikasi Buku Melewati Batas Pengembalian

> **Note:** Tipe OVERDUE, dipicu sekali saat status menjadi "Terlambat" (Q-30); format tanggal [COPY-TBD Q-36].

```gherkin
Given saya seorang member
  And terdapat buku yang berstatus "Terlambat"
When saya menekan icon Notifikasi
Then tampil notifikasi "Buku melewati batas pengembalian" dengan keterangan "{judul_buku} jatuh tempo pada {tanggal_batas_pengembalian}. Segera ajukan pengembalian."
```
