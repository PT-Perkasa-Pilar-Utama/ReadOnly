# Acceptance Criteria: Sprint 2

> **Traceability historis:** file ini berisi alokasi awal 50 AC dalam rencana 3 sprint. Rujukan Sprint 2/Sprint 3 di dalamnya hanya konteks lama, bukan jadwal atau komitmen PM. Lihat [rundown satu sprint](../sprint-breakdown.md); scope dipilih saat Sprint Planning.

**Sprint Focus:** Katalog Member, Peminjaman dengan QR, dan Dashboard Admin
**Version:** 0.1
**Date:** 2026-11-05

## User Stories in Scope

> Catatan: breakdown ini tetap alokasi awal 50 AC. Persona US-08 mengikuti sheet terbaru (`Member, Admin`); kartu dan AC tetap dipisah per aktor.

- US-07: Melihat Buku (Member) - 4 AC
- US-08: Meminjam Buku (Member, Admin) - 6 AC
- US-04: Melihat Dashboard (Admin Perpus) - 1 AC

## US-07: Melihat Buku (Member)

### AC-07.01: Membuka halaman Home

> **Note:** Rekomendasi Home pada Sprint 2 hanya berbasis genre (AC-07.01); section Rekomendasi rating ada di Sprint 3 (Q-28).

```gherkin
Given saya berhasil login sebagai member
When sistem mengarahkan saya ke halaman Home
  Or saya menekan menu Home
Then tampil rekomendasi buku berdasarkan referensi genre yang telah dipilih pada halaman register
  Or genre sesuai preferensi register Member (AC-07.01; tanpa rating pada Sprint 2, Q-28).
  And tampil semua buku yang tersedia diperpustakaan
  Or daftar buku termasuk buku berstok 0 dengan label "Tidak Tersedia" (Q-12/Q-28).
```

### AC-07.02: Memfilter buku berdasarkan Penulis dan Genre

```gherkin
Given saya seorang member
  And berada di halaman Home
When saya menekan icon Filter
  And memilih Penulis (Dropdown)
  Or "author" pada sumber; GLOSSARY kanonik adalah "Penulis".
  Or memilih Genre (Dropdown)
  And menekan tombol "Set Filter"
Then hanya menampilkan buku sesuai filter yang dipilih
  And setiap buku tetap menampilkan label "Tersedia" / "Tidak Tersedia"
```

### AC-07.03: Mencari buku berdasarkan Judul Buku, penulis, atau genre

```gherkin
Given saya seorang member
  And berada di halaman Home
When saya mengetikkan keyword judul buku/penulis/genre
Then hanya menampilkan buku sesuai keyword yang dicari
```

### AC-07.04: Melihat Detail Buku

```gherkin
Given saya seorang member
  And berada di halaman Home
When saya menekan icon Detail pada salah satu buku
Then tampil Detail informasi buku seperti
  - Cover
  - Judul Buku
  - Penulis
  - Penerbit
  - Tahun Terbit
  - Sinopsis
  - Genre
  - Ketersediaan Buku
  And tampil tombol "Pinjam" (lihat AC-08.01)
```

## US-08: Meminjam Buku (Member, Admin)

### AC-08.01: Mengajukan Peminjaman dari Halaman Detail Buku

- **Subtask:** [BE] POST `/loans` buat peminjaman "Pending Peminjaman"; [FE] tombol "Pinjam" disable bila stok 0 (AC-08.04).

```gherkin
Given saya seorang member
  And berada di halaman Detail Buku
  And Ketersediaan Buku berstatus "Tersedia"
  Or buku berstok > 0; bila 0, tombol "Pinjam" disable (AC-08.04).
When saya menekan tombol "Pinjam"
Then tampil pesan sukses: "Pengajuan peminjaman berhasil"
  And diarahkan ke halaman Pinjaman
  And buku tampil dengan status "Pending Peminjaman" beserta tombol "QR"
```

### AC-08.02: Melakukan Konfirmasi Peminjaman ke Admin Perpus

- **Subtask:** [FE] Pop up "QR Code Peminjaman" + pustaka QR generator; [BE] GET `/loans/:id/qr`.

```gherkin
Given saya seorang member
  And berada di halaman Pinjaman
  And terdapat buku yang berstatus "Pending Peminjaman"
When saya menekan tombol "QR" pada buku yang berstatus "Pending Peminjaman"
Then tampil pop up "QR Code Peminjaman"
  And ditunjukkan ke Admin Perpus untuk di scan dan dikonfirmasi
```

### AC-08.03: Menyetujui Peminjaman Buku dengan QR Code

> **Note:** Stok berkurang hanya saat Admin mengonfirmasi (AC-08.03); conditional decrement `available_count > 0`, tolak 409 bila 0 (Q-15). Token QR hash/sekali pakai (Q-18).

```gherkin
Given saya seorang Admin perpus
  And berada di halaman Dashboard
  And terdapat member yang ingin mengonfirmasi peminjaman buku
When saya menekan tombol "Scan QR"
  Or tombol "Scan QR" berada di Dashboard (AC-08.03).
  And tampil pop up Scan QR Code dan saya melakukan scanning QR Code
  And tampil pop up "Konfirmasi Peminjaman" berisi:
  - Detail Peminjam: Nama Peminjam, Tanggal Permintaan, Durasi Peminjaman (7 hari)
  - Detail Buku: Cover, Judul Buku, Penulis, Penerbit, Tahun Terbit, Genre
  And menekan tombol "Konfirmasi Peminjaman"
Then tampil pesan sukses: "Buku berhasil Dipinjam"
  And sistem mengurangi jumlah ketersediaan buku
  Or `available_count` decrement bersyarat (Q-15)
  And status buku di halaman Pinjaman akun member berubah menjadi "Sedang Dipinjam"
```

### AC-08.04: Buku Tidak Tersedia

```gherkin
Given saya seorang member
  And berada di halaman Detail Buku
  And Ketersediaan Buku berstatus "Tidak Tersedia" (0 buku)
When saya melihat tombol "Pinjam"
Then tombol "Pinjam" dalam kondisi disable
```

### AC-08.05: Melihat Daftar Pinjaman Saya

```gherkin
Given saya login sebagai member
When saya membuka halaman Pinjaman
Then tampil daftar peminjaman saya berisi Cover, Judul Buku, Penulis, Nomor Pinjaman, Tanggal permintaan (untuk "Pending Peminjaman") atau Batas pengembalian (status lainnya), dan Status
  And tampil aksi sesuai status:
  - tombol "QR" untuk "Pending Peminjaman"
  - tombol "Kembalikan" untuk "Sedang Dipinjam" dan "Terlambat"
  - keterangan "Menunggu admin" untuk "Pending Pengembalian" dan "Pending Keterlambatan"
  - keterangan "Selesai" untuk "Sudah Dikembalikan"
```

### AC-08.06: Scan QR Code Tidak Valid

> **Note:** Token QR di-hash, sekali pakai, terikat satu peminjaman; QR invalid tidak mengubah status/stok (Q-18).

```gherkin
Given saya seorang Admin perpus
  And pop up Scan QR Code sedang tampil
When saya melakukan scanning QR Code yang tidak valid
  Or QR Code tidak dikenali server (hash tidak cocok).
  Or peminjamannya sudah dikonfirmasi sebelumnya
  Or token sudah pernah dikonsumsi.
Then tampil pesan error: "QR Code tidak valid"
  And status peminjaman dan jumlah ketersediaan buku tidak berubah
```

## US-04: Melihat Dashboard (Admin Perpus)

> **Note:** Definisi metrik: pinjam bukan eksemplar; "Sedang Dipinjam" mencakup "Pending Pengembalian"; "Terlambat" mencakup "Pending Keterlambatan"; "Total buku" = judul aktif; pie chart = dikembalikan tepat waktu (late_days = 0) melawan terlambat (Q-26).

### AC-04.01: Melihat Dashboard

> **Note:** Metrik Dashboard diuji dengan seed QA yang sudah memuat status lanjutan (Sprint 2 bergantung pada status Sprint 3).

```gherkin
Given saya login sebagai Admin Perpus
When saya membuka halaman Dashboard
Then tampil metric informasi summary peminjaman seperti:
  - total buku
  Or jumlah judul aktif (tidak soft-deleted).
  - total ketersediaan buku
  Or penjumlahan `available_count`.
  - total buku yang berstatus "Sedang Dipinjam"
  Or mencakup "Pending Pengembalian" (Q-26).
  - total buku yang berstatus Terlambat
  Or mencakup "Pending Keterlambatan" (Q-26).
  - total buku yang berstatus Sudah Dikembalikan
  - pie chart total buku yang dikembalikan tepat waktu dan terlambat
  Or peminjaman "Sudah Dikembalikan" late_days = 0 melawan > 0 (Q-26).
```
