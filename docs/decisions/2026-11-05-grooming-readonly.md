**Version:** 0.1
**Date:** 2026-11-05
**Author:** Tech Lead
**Status:** Draft
**Phase:** Backlog Grooming

# Grooming - ReadOnly

**Riwayat, bukan baseline aktif.** Hasil grooming terbaru ada di [2026-11-06-grooming-final.md](2026-11-06-grooming-final.md) dan spreadsheet final. Gunakan dokumen terbaru itu bila ada konflik. Register di bawah merekam asumsi dan pertanyaan pada 5 November.

## 1. Context

Ruang lingkup pada saat grooming ini: 10 US, 50 AC, 3 sprint. Spreadsheet terbaru yang diberikan pemilik proyek menjadi baseline saat ini: 12 US dan 77 AC. Sheet Business Value masih berisi konten produk lain (HRIS / penilaian kinerja) dan **tidak dipakai** sebagai NFR ReadOnly.

Sheet BA Approval bertanggal 2025-12-07, lebih awal dari Start Date 2026-01-22 (Q-34). Figma belum diverifikasi (Q-33).

## 2. Decision Register

| Q-ID | Status | Default yang dipakai | Dokumen terdampak |
| --- | --- | --- | --- |
| Q-01 | Open | Web app responsif, scan kamera browser | spek 01, spek 14, deploy 01 |
| Q-02 | Superseded | UI tambah Admin diwajibkan AC-12.02; bootstrap Admin pertama masih terbuka | spek 06, spek 09, spek 11, US-12 |
| Q-03 | Assumed | Out of Scope v1: forgot/reset password, ubah profil, hapus akun, email/push notification, pembatalan pinjaman | spek 01 |
| Q-04 | Open | Min 8 karakter, rate limit 429, pesan `[COPY-TBD Q-04]` | spek 07, spek 09, API 02 |
| Q-05 | Assumed | Validasi saat Next (keunikan email 409) dan Daftar (genre); typo AC-01.03-01.05 | spek 09, API 02 |
| Q-06 | Superseded | AC-02.01 terbaru menyebut `newmember@gmail.com` tampil di pojok kanan atas | biz, API 02 |
| Q-07 | Assumed | Pesan login membedakan email/password, risiko diterima | spek 07, biz |
| Q-08 | Open | Hanya mandatory, batas panjang/server-side aman, format nomor `[COPY-TBD Q-08]` | spek 06, API 02 |
| Q-09 | Assumed | `available_count` atomik dengan CHECK >= 0 | spek 06, spek 13 |
| Q-10 | Superseded | US-11 meminta Master Genre dengan tambah, edit, status aktif/nonaktif, hapus, dan cari | spek 06, API 03, US-11 |
| Q-11 | Assumed | Soft delete, tolak bila ada pinjaman belum dikembalikan | spek 13, API 03, biz |
| Q-12 | Assumed | Paginasi server 10/halaman, terbaru dulu | spek 16, API 01 |
| Q-13 | Assumed | Validasi MIME + magic bytes, 5 MiB, nama acak, tanpa transcoding | spek 17, API 03 |
| Q-14 | Assumed | Semua field kecuali ID boleh diedit; tanpa ISBN, tanpa unik judul | API 03 |
| Q-15 | Assumed | Stok berkurang saat konfirmasi, conditional decrement, 409 | spek 13, API 04 |
| Q-16 | Open | Pending tanpa batas; usulan pembatalan + 24 jam expiry | spek 12 |
| Q-17 | Open | Tanpa batas jumlah/pinjaman judul yang sama; usulan limit | spek 12 |
| Q-18 | Assumed | Token 128 bit, hash, sekali pakai, terikat peminjaman | spek 14, API 04 |
| Q-19 | Assumed | Hari WIB, batas = konfirmasi + 7, late_days dibekukan | spek 12, spek 15 |
| Q-20 | Assumed | 1–4 hari Rp 2.000 flat; ≥5 hari input manual 1..99.999.999 | spek 12, API 04 |
| Q-21 | Assumed | Satu `fine_amount`; `fine_status` Sudah Bayar/Belum Bayar | spek 12, GLOSSARY |
| Q-22 | Assumed | AC-09.04 untuk 1–4 hari (alert), AC-09.08 untuk ≥5 hari (pop up) | spek 12, API 04 |
| Q-23 | Assumed | Tunai di tempat, catat Admin + waktu | spek 12, API 04 |
| Q-24 | Assumed | Status beku saat menunggu Admin | spek 12, spek 15 |
| Q-25 | Assumed | 5 status (semua kecuali Pending Peminjaman) | API 04, biz |
| Q-26 | Assumed | Definisi metrik: pinjam bukan eksemplar, Pending Pengembalian masuk Sedang Dipinjam | spek 05, API 06 |
| Q-27 | Assumed | Satu rating wajib per pinjaman, ambang tegas > 3 | spek 16, API 03, biz |
| Q-28 | Assumed | Rekomendasi genre ATAU rating > 3, urut rating lalu terbaru, judul `[COPY-TBD Q-28]` | spek 16, API 03, biz |
| Q-29 | Updated | Daftar notifikasi tetap ada; AC-10.04 sampai AC-10.08 menambah popup per login. Badge dan tandai dibaca belum ditentukan | spek 15, API 05 |
| Q-30 | Assumed | Tiga tipe: DUE_SOON_3D, DUE_TODAY, OVERDUE; unik per (loan, type) | spek 15, API 05 |
| Q-31 | Assumed | Job 00:05 WIB, advisory lock, Clock port injectable | spek 15, deploy 04, deploy 07 |
| Q-32 | Open | Target provisional: p95 300 ms, load < 2s, 99% uptime, 10k buku/1k member/50k pinjaman | spek 08, spek 01 |
| Q-33 | Open | Pustaka UI belum diputus; sinkronisasi Figma belum diverifikasi | spek 04, README |
| Q-34 | Updated | Baseline terbaru 12 US dan 77 AC; tanggal approval spreadsheet masih 2025-12-07 | biz, ac_raw.md, grooming-final |
| Q-35 | Updated | Spreadsheet mencantumkan persona `Member, Admin` untuk US-08 dan US-09; kartu tetap dipisah per aktor AC | spek 09, task-breakdown |
| Q-36 | Open | Format `PJM-<YYYYMMDD>-<0001>` dan tanggal `d MMMM yyyy` | spek 15, API 04 |
| Q-37 | Open | Owner review untuk PR kartu milik TL: BE1 atau FE1 sesuai area | team-and-process |

## 3. Question Log

### I: Independent

#### Q-01: Platform dan perangkat (US-08, AC-08.02, AC-08.03)

- **Pertanyaan:** Apakah aplikasi ini web responsif atau native? Device apa saja yang dipetakan oleh Figma (desktop, tablet, mobile)?
- **Mengapa penting:** Menentukan arsitektur (SPA web vs native), ketersediaan API kamera browser, dan syarat HTTPS di staging/production untuk akses kamera.
- **Rekomendasi:** Web app responsif. Member menampilkan QR di layar, Admin memindai lewat kamera browser. Tanpa aplikasi native.
- **Dampak jika berbeda:** Harus menulis ulang spek 01 dan 14, tambah dependency native bridge, dan deploy plan berubah.

#### Q-02: Akun Admin Perpus (US-02, AC-02.05)

- **Pertanyaan:** Bagaimana akun Admin Perpus dibuat dan dikelola pada awal? Ada UI kelola admin atau tidak?
- **Mengapa penting:** Menentukan seeder vs UI CRUD admin.
- **Rekomendasi:** Tidak ada US pembuatan Admin. Akun Admin dibuat seeder, kredensial dari variabel lingkungan, bukan hardcode. Tanpa UI kelola admin.
- **Dampak jika berbeda:** Menambah user story baru, kartu, estimasi, dan spek 11 (seeding).

#### Q-03: Apa yang sengaja di luar v1 (tidak ada AC)

- **Pertanyaan:** Mana yang boleh disebut out-of-scope v1: forgot/reset password, ubah profil/preferensi genre, hapus akun, email/push notification, pembatalan pinjaman?
- **Mengapa penting:** Menjaga scope tetap 50 AC.
- **Rekomendasi:** Semua di atas masuk Out of Scope v1.
- **Dampak jika berbeda:** Menambah user story dan kartu.

#### Q-04: Kebijakan password dan brute force (US-01, US-02)

- **Pertanyaan:** Berapa minimum panjang password? Ada aturan kompleksitas? Apa teks pesan batas rate limit login?
- **Mengapa penting:** Keamanan login dan teks UI copy.
- **Rekomendasi:** Minimum 8 karakter, tanpa aturan kompleksitas. Rate limit login per IP dan per email (bukan lockout), hasil HTTP 429. Teks pesan batas: `[COPY-TBD Q-04]`.
- **Dampak jika berbeda:** Kode 07 security, 09 auth, API 02, standar 09, dan checklist 04 berubah.

#### Q-05: Validasi register dua langkah (US-01, AC-01.03 sampai AC-01.08)

- **Pertanyaan:** Kapan keunikan email dicek - saat tombol "Next" atau saat tombol "Daftar"? (AC-01.08 menyebut "Next", tetapi AC-01.03–AC-01.05 menyebut tombol "Daftar" padahal field ada di langkah 1.)
- **Mengapa penting:** Mencegah race condition 409 dan menentukan kapan server-side uniqueness check dijalankan.
- **Rekomendasi:** Validasi mandatory, format email, konfirmasi password, dan keunikan email saat "Next" (klien + server). Genre divalidasi saat "Daftar". Keunikan email dicek ulang saat "Daftar" (race, HTTP 409). AC-01.03–AC-01.05 dianggap salah tulis ("Daftar" bukannya "Next").
- **Dampak jika berbeda:** API 02 (endpoint `/auth/register/validate`), flow autentikasi, tes konfiringensi.

#### Q-06: Nama di pojok kanan atas (US-02, AC-02.01)

- **Pertanyaan:** Apakah yang ditampilkan di pojok kanan atas adalah email atau Nama lengkap?
- **Mengapa penting:** Teks UI copy dan field display.
- **Rekomendasi:** Tampilkan Nama lengkap dari form register. AC-02.01 yang menyebut `newmember@gmail.com` dianggap salah tulis.
- **Dampak jika berbeda:** Field display FE, GLOSSARY, API 02.

#### Q-07: Pesan login membedakan email tak terdaftar dan password salah (US-02, AC-02.02, AC-02.03)

- **Pertanyaan:** Apakah BA setuju pesan login membedakan "email tidak terdaftar" dari "password salah" (berpotensi mengenkumerasi akun)?
- **Mengapa penting:** Risiko keamanan enumerasi akun.
- **Rekomendasi:** Diterima sebagai keputusan BA dan ditiru verbatim; dicatat sebagai risiko yang diterima dengan mitigasi rate limit.
- **Dampak jika berbeda:** API 02, spek 07 (risiko diterima), standar keamanan.

#### Q-08: Validasi Alamat dan Nomor Ponsel (US-01, AC-01.01, AC-01.03)

- **Pertanyaan:** Apakah Alamat dan Nomor Ponsel punya aturan format khusus (hanya wajib), dan format nomor ponsel seperti apa?
- **Mengapa penting:** Validasi field dan tipe data.
- **Rekomendasi:** Hanya wajib diisi (sesuai AC). Server menambahkan batas panjang dan karakter aman tanpa pesan UI baru. Format nomor ponsel belum ditetapkan.
- **Dampak jika berbeda:** Skema users, validasi, API 02.

#### Q-09: Model stok (US-05, US-08, US-09, AC-05.01, AC-05.05, AC-05.07, AC-07.02, AC-08.03, AC-09.03, AC-09.05)

- **Pertanyaan:** Apakah stok disimpan sebagai satu angka "Jumlah Ketersediaan" yang berubah-ubah, atau sebagai total stok ditambah ketersediaan turunan?
- **Mengapa penting:** Menentukan skema `books`, invarian, dan pola konkurensi.
- **Rekomendasi:** Simpan `available_count`, diubah atomik oleh peminjaman dan pengembalian, dengan CHECK >= 0. Edit Admin menetapkan nilai baru. Spek 13 membandingkan opsi A (`available_count`) melawan opsi B (`total_stock` + ketersediaan turunan) dan mencatat risiko drift.
- **Dampak jika berbeda:** Skema books, spek 13, tes stok.

### S: Small / Estimable

#### Q-10: Genre (US-01, AC-01.02, AC-01.07, AC-05.01, AC-05.07, AC-07.01, AC-07.02)

- **Pertanyaan:** Berapa daftar genre awal yang diminta BA? Genre perlu CRUD atau cukup seeder?
- **Mengapa penting:** Sumber dropdown dan data awal.
- **Rekomendasi:** Tidak ada US kelola genre. Tabel `genres` diisi seeder, tanpa CRUD. Buku punya satu atau lebih genre. Daftar genre awal diminta dari BA.
- **Dampak jika berbeda:** Menambah user story CRUD genre, kartu, estimasi, API.

#### Q-11: Hapus buku (US-05, AC-05.06, AC-05.09)

- **Pertanyaan:** Apakah penghapusan buku bersifat hard delete atau soft delete?
- **Mengapa penting:** Mempertahankan riwayat peminjaman.
- **Rekomendasi:** Soft delete (`deleted_at`) agar riwayat peminjaman utuh. Ditolak bila ada peminjaman yang belum "Sudah Dikembalikan", termasuk "Pending Peminjaman". Pengecekan dan penghapusan dalam satu transaksi.
- **Dampak jika berbeda:** Skema books, API 03, spek 13.

#### Q-12: Paginasi dan urutan (US-05, US-07, US-08, AC-05.07, AC-06.01, AC-07.01, AC-08.05)

- **Pertanyaan:** Berapa item per halaman dan urutan default?
- **Mengapa penting:** Performa daftar dan UX.
- **Rekomendasi:** Paginasi sisi server 10 per halaman, terbaru dulu, pada Master Buku, Home, Manajemen Peminjaman, dan Pinjaman.
- **Dampak jika berbeda:** API 01 (paginasi), semua endpoint daftar, tes.

#### Q-13: Cover: validasi dan penyimpanan (US-05, AC-05.01, AC-05.03, AC-05.04)

- **Pertanyaan:** Apakah cover ditranscoding ke format/warna tertentu, atau hanya validasi?
- **Mengapa penting:** Memilih pustaka dan port Storage.
- **Rekomendasi:** Validasi ekstensi, MIME, dan magic bytes (png, jpg, jpeg). Batas 5 MiB. Nama file acak. Tanpa transcoding. Wajib saat Add, opsional saat Edit. Berkas yatim dibersihkan bila transaksi gagal.
- **Dampak jika berbeda:** Spek 17, pustaka transcode, deployment volume.

#### Q-14: Edit buku dan duplikat (US-05, AC-05.05)

- **Pertanyaan:** Apakah judul buku harus unik? Ada field ISBN?
- **Mengapa penting:** Constraint database dan validasi.
- **Rekomendasi:** Semua field kecuali ID boleh diubah. Tanpa ISBN dan tanpa constraint unik judul pada v1.
- **Dampak jika berbeda:** Skema books, API 03, tes duplikat.

#### Q-15: Stok tidak direservasi saat Pending (US-08, AC-08.01, AC-08.03, AC-08.04)

- **Pertanyaan:** Apakah stok berkurang saat Member mengajukan, atau hanya saat Admin mengonfirmasi?
- **Mengapa penting:** Determinasi balapan dua Member merebut stok terakhir.
- **Rekomendasi:** Stok berkurang hanya saat Admin mengonfirmasi (AC-08.03), jadi dua Member dapat mengajukan buku berstok 1. Konfirmasi memakai decrement bersyarat (`available_count > 0`). Bila 0, konfirmasi ditolak dan status tetap "Pending Peminjaman". Pesan penolakan `[COPY-TBD Q-15]`.
- **Dampak jika berbeda:** Spek 13, API 04, tes konkurensi.

#### Q-16: Pending Peminjaman tanpa batas waktu (US-08, AC-08.01, AC-05.09)

- **Pertanyaan:** Apakah ada batas kedaluwarsa atau pembatalan untuk status "Pending Peminjaman"?
- **Mengapa penting:** Peminjaman Pending memblokir hapus buku selamanya.
- **Rekomendasi:** Default v1 mengikuti AC (tidak ada). Usulan AC baru: pembatalan oleh Member dan kedaluwarsa 24 jam. Masuk Open Follow-ups spek 12.
- **Dampak jika berbeda:** Menambah user story, kartu, spek 12, tes.

#### Q-17: Batas pinjaman aktif (US-08)

- **Pertanyaan:** Apakah ada batas jumlah pinjaman aktif per Member atau larangan meminjam judul yang sama dua kali?
- **Mengapa penting:** Membatasi perilaku member yang tidak diatur BA.
- **Rekomendasi:** Tidak ada batas jumlah dan tidak ada larangan meminjam judul yang sama dua kali. Default v1 mengikuti AC. Usulan AC baru: maksimum pinjaman aktif per Member dan satu pinjaman aktif per judul.
- **Dampak jika berbeda:** Guard di service, kartu, estimasi.

### E: Estimation-relevant (angka)

#### Q-18: Token QR dan alur scan (US-08, AC-08.02, AC-08.03, AC-08.06)

- **Pertanyaan:** Apa isi QR Code: id polos pinjaman, atau token sekali pakai? Apakah scan langsung konfirmasi atau ada pratinjau?
- **Mengapa penting:** Keamanan QR (bisa dipindai ulang) dan UX Admin dua langkah.
- **Rekomendasi:** QR memuat token acak kriptografis (minimal 128 bit), disimpan sebagai hash, sekali pakai, terikat satu peminjaman. Alur Admin dua langkah: scan menghasilkan pratinjau detail (pop up "Konfirmasi Peminjaman"), lalu tombol "Konfirmasi Peminjaman" mengonsumsi token. Token tak dikenal, sudah dipakai, atau peminjaman bukan "Pending Peminjaman" menghasilkan "QR Code tidak valid". Tanpa kedaluwarsa pada v1.
- **Dampak jika berbeda:** Spek 14, API 04, tes e2e kamera.

#### Q-19: Hitung keterlambatan (US-06, AC-06.01, AC-06.02, AC-06.03)

- **Pertanyaan:** Hari berapa yang dihitung sebagai hari terlambat, dan zona waktu apa?
- **Mengapa penting:** Benar atau tidaknya denda.
- **Rekomendasi:** Hari kalender WIB. Batas pengembalian = tanggal konfirmasi + 7 hari. "Terlambat" mulai hari berikutnya. Hari terlambat = selisih tanggal, dibekukan saat Member mengajukan pengembalian (`return_requested_at`) sehingga keterlambatan tidak bertambah selama menunggu Admin.
- **Dampak jika berbeda:** Spek 12, 15, tes batas tanggal.

#### Q-20: Aturan denda (US-06, US-09, AC-06.02, AC-09.08, AC-09.09)

- **Pertanyaan:** Berapa nominal denda untuk keterlambatan ≥5 hari, dan batas atas input Admin?
- **Mengapa penting:** Fungsi denda murni dan validasi.
- **Rekomendasi:** 1–4 hari: Rp 2.000 flat otomatis. 5 hari atau lebih: Admin menginput nominal saat pembayaran. Input manual berupa bilangan bulat rupiah >= 1 dan <= batas atas (default 99.999.999). Selain itu muncul "Biaya denda wajib diisi dengan angka". Konstanta ditulis hanya di spek 12.
- **Dampak jika berbeda:** Spek 12 (fungsi denda), API 04, tes denda.

#### Q-21: Istilah denda (US-06, US-09, AC-06.02, AC-09.08)

- **Pertanyaan:** Apa arti "Biaya Denda", "Total Denda", dan "Status Pembayaran"; apakah keduanya bernilai sama?
- **Mengapa penting:** Field database dan label UI.
- **Rekomendasi:** Satu nilai `fine_amount`, label "Biaya Denda" dan "Total Denda" menampilkan nilai yang sama. `fine_status` bernilai "Sudah Bayar" (dari AC-09.08), lawannya "Belum Bayar" `[COPY-TBD Q-21]`.
- **Dampak jika berbeda:** Skema loans, GLOSSARY, API 04.

#### Q-22: AC-09.04 dan AC-09.08 tumpang tindih (US-09, AC-09.04, AC-09.08)

- **Pertanyaan:** Kedua AC memakai tombol "Pembayaran Denda". Apakah keduanya dipisah berdasarkan lama keterlambatan?
- **Mengapa penting:** Alur UI Admin berbeda (alert vs pop up).
- **Rekomendasi:** AC-09.04 untuk keterlambatan 1–4 hari (nominal otomatis, alert rekonfirmasi "Denda {member_name} adalah {total_denda}. Apakah benar telah dibayar?"). AC-09.08 untuk 5 hari atau lebih (pop up "Biaya Denda").
- **Dampak jika berbeda:** UI Admin, API 04, tes.

#### Q-23: Pembayaran denda (US-09, AC-09.04, AC-09.08)

- **Pertanyaan:** Bagaimana metode pembayaran denda yang dicatat sistem?
- **Mengapa penting:** Menentukan field audit denda (tanpa payment gateway).
- **Rekomendasi:** Dibayar tunai di tempat. Sistem hanya mencatat (Admin siapa, kapan). Tanpa payment gateway, cicilan, atau pembebasan denda.
- **Dampak jika berbeda:** Skema loans, spek 12, integrasi gateway.

#### Q-24: Status beku saat menunggu Admin (US-09, AC-09.01, AC-09.02, AC-09.03)

- **Pertanyaan:** Apakah status pinjaman terus berubah oleh job harian saat Member sudah mengajukan pengembalian?
- **Mengapa penting:** Menjaga status Pending Pengembalian/Keterlambatan tetap stabil.
- **Rekomendasi:** Setelah Member mengajukan pengembalian, job harian tidak mengubah status lagi. Stok bertambah hanya saat Admin mengonfirmasi. Pengajuan yang menunggu melewati batas pengembalian tetap "Pending Pengembalian".
- **Dampak jika berbeda:** Spek 12 dan 15, job scheduler.

#### Q-25: Daftar Manajemen Peminjaman (US-06, AC-06.01, AC-09.03)

- **Pertanyaan:** Status apa saja yang tampil di halaman Manajemen Peminjaman?
- **Mengapa penting:** Filter/endpoint Admin.
- **Rekomendasi:** Tampilkan lima status (semua kecuali "Pending Peminjaman"). Tanpa filter dan pencarian pada v1.
- **Dampak jika berbeda:** API 04, daftar Admin, tes.

#### Q-26: Definisi metrik Dashboard (US-04, AC-04.01)

- **Pertanyaan:** Bagaimana menghitung "total ketersediaan buku" dan isi pie chart tepat waktu vs terlambat?
- **Mengapa penting:** Benar atau tidaknya Dashboard.
- **Rekomendasi:** "Total buku" = jumlah judul aktif (bukan soft-deleted). "Total ketersediaan buku" = jumlah `available_count`. "Sedang Dipinjam" mencakup "Pending Pengembalian". "Terlambat" mencakup "Pending Keterlambatan". "Sudah Dikembalikan" apa adanya. Pie chart = peminjaman "Sudah Dikembalikan" dengan `late_days = 0` melawan lebih dari 0.
- **Dampak jika berbeda:** API 06, spek 05, seed QA.

### C: Concrete / unambiguous

#### Q-27: Rating (US-09, AC-09.01, AC-09.02, AC-09.06, AC-09.07)

- **Pertanyaan:** Apakah rating disimpan saat Member submit atau saat Admin konfirmasi? Ambang "rating > 3" tegas atau rata-rata?
- **Mengapa penting:** Timing write dan algoritma rekomendasi.
- **Rekomendasi:** Satu rating per peminjaman, wajib, disimpan saat "Submit" walau Admin belum mengonfirmasi. "Rating > 3 masuk section rekomendasi" ditafsirkan sebagai rata-rata rating buku lebih dari 3 (ambang tegas). Pembatalan pop up tidak menyimpan apa pun.
- **Dampak jika berbeda:** Skema ratings, algoritma rekomendasi, tes.

#### Q-28: Section Rekomendasi di Home (US-07, US-09, AC-07.01, AC-09.01)

- **Pertanyaan:** Rekomendasi berdasarkan apa: genre atau rating? Apa judul section?
- **Mengapa penting:** Halaman Home dan algoritma.
- **Rekomendasi:** Section "Rekomendasi" berisi buku bergenre sesuai preferensi Member ATAU berating rata-rata lebih dari 3, tanpa duplikat, urut rata-rata rating menurun lalu terbaru. Judul section `[COPY-TBD Q-28]`. Daftar semua buku tetap menampilkan buku "Tidak Tersedia" dengan label (AC-07.02).
- **Dampak jika berbeda:** API 03, algoritma, halaman Home.

#### Q-29: Notifikasi in-app (US-10, AC-10.01, AC-10.02, AC-10.03)

- **Pertanyaan:** Bagaimana notifikasi dikirim: push/email/WiFi Socket, atau daftar yang dipolling di halaman Notifikasi?
- **Mengapa penting:** Arsitektur notifikasi.
- **Rekomendasi:** Hanya daftar yang dibuka lewat ikon Notifikasi, terbaru dulu. REST dengan polling ringan, tanpa WebSocket. Badge belum dibaca dan tandai dibaca tidak ada di AC, masuk Open Follow-ups. Tanpa notifikasi untuk Admin.
- **Dampak jika berbeda:** Spek 15, API 05, notifikasi backend.

#### Q-30: Tipe dan pemicu notifikasi (US-10, AC-10.01, AC-10.02, AC-10.03)

- **Pertanyaan:** Berapa tipe notifikasi dan kapan dipicu?
- **Mengapa penting:** Tabel job dan model data.
- **Rekomendasi:** Tiga tipe: `DUE_SOON_3D` (3 hari sebelum batas, status "Sedang Dipinjam"), `DUE_TODAY` (pada tanggal batas, status masih "Sedang Dipinjam", teks AC-10.01), `OVERDUE` (sekali, saat status menjadi "Terlambat", teks AC-10.03). Unik per (peminjaman, tipe). AC-10.01 dan AC-10.03 tumpang tindih, dipisahkan berdasarkan hari.
- **Dampak jika berbeda:** Model notifikasi, job scheduler, template teks.

#### Q-31: Penjadwal harian (US-10, AC-06.03)

- **Pertanyaan:** Di mana job harian dijalankan: in-process dengan lock, worker terpisah, atau cron OS? Jam berapa dan bagaimana ujinya?
- **Mengapa penting:** Idempotensi, catch-up, dan pengujian deterministik.
- **Rekomendasi:** Job harian 00:05 Asia/Jakarta: (1) ubah status menjadi "Terlambat", (2) buat notifikasi. Idempoten (advisory lock + constraint unik), menyusul peminjaman yang terlewat saat server mati (catch-up saat start), jam disuntikkan lewat Clock port. Non-prod: perintah dan endpoint "jalankan job sekarang" untuk QA.
- **Dampak jika berbeda:** Spek 15, deployment 04/07, tes.

#### Q-32: NFR (tidak ada di sheet)

- **Pertanyaan:** Berapa target performa dan skala resmi (p95, waktu muat, uptime, jumlah data)?
- **Mengapa penting:** Arsitektur, skalabilitas, dan SLO.
- **Rekomendasi:** Target provisional `[ASSUMED Q-32]`: p95 endpoint daftar di bawah 300 ms pada 10.000 buku, halaman termuat di bawah 2 detik pada broadband, ketersediaan 99% pada jam kerja, volume 10.000 buku, 1.000 Member, 50.000 peminjaman. Minta angka resmi dari BA.
- **Dampak jika berbeda:** Spek 08, tuning query, infrastruktur.

### R: Real / verifiable

#### Q-33: Pustaka UI dan Figma (semua AC)

- **Pertanyaan:** Pustaka komponen mana yang dipakai? Apakah dokumen sudah diverifikasi terhadap Figma?
- **Mengapa penting:** Konsistensi desain dan pustaka FE.
- **Rekomendasi:** Pustaka komponen belum diputus, UI mengikuti Figma. Kesesuaian dokumen dengan Figma belum diverifikasi (belum diverifikasi). Sampai ada pengecekan, teks field dan tombol pada AC adalah sumber UI.
- **Dampak jika berbeda:** Spek 04, README, setiap halaman FE.

#### Q-34: Baseline persetujuan BA (US/AC)

- **Pertanyaan:** Apakah 50 AC ini baseline yang disetujui, mengingat sheet BA Approval bertanggal 2025-12-07 (lebih awal dari Start Date 2026-01-22)? Dan bagaimana dengan catatan H27 di AC-06.02 ("masih perlu ac buat isi yang lebih dari 5 hari")?
- **Mengapa penting:** Validasi baseline terhadap timeline proyek.
- **Rekomendasi:** Minta konfirmasi bahwa 50 AC adalah baseline yang disetujui. Catatan H27 dianggap sudah ditutup oleh AC-09.08 sampai AC-09.10; BA diminta menghapusnya.
- **Dampak jika berbeda:** Jumlah AC berubah, semua dokumen traceability berubah.

#### Q-35: Persona campur pada US (US-08, US-09)

- **Pertanyaan:** US-08 dan US-09 berpersona Member tetapi memuat AC milik Admin Perpus (AC-08.03, AC-08.06, AC-09.03, AC-09.04, AC-09.05, AC-09.08, AC-09.09, AC-09.10). Apakah dokumen bisnis dipertahankan begitu, dan kartu dipisah per persona?
- **Mengapa penting:** Pemecahan kartu dan ownership per PR.
- **Rekomendasi:** Dokumen bisnis mempertahankan struktur BA. Kartu dipecah per persona: kartu Member dan kartu Admin Perpus tidak digabung dalam satu PR. Matriks peran per operasi ada di spek 09.
- **Dampak jika berbeda:** Task breakdown, kartu, estimasi.

#### Q-36: Format Nomor Pinjaman dan tanggal (US-08, US-10, AC-08.05, AC-10.02, AC-10.03)

- **Pertanyaan:** Format Nomor Pinjaman dan format `{tanggal_batas_pengembalian}` di notifikasi?
- **Mengapa penting:** Konstanta format yang konsisten.
- **Rekomendasi:** `PJM-<YYYYMMDD>-<urut 4 digit>`. `{tanggal_batas_pengembalian}` default `d MMMM yyyy` dalam bahasa Indonesia. Keduanya `[COPY-TBD Q-36]`.
- **Dampak jika berbeda:** Generator nomor, template notifikasi, GLOSSARY, tes.

### I: Independent (lanjutan temuan sendiri)

#### Q-37: Owner review untuk PR kartu milik TL (tidak ada di AC)

- **Pertanyaan:** Siapa yang mereview PR milik kartu TL (scaffold)?
- **Mengapa penting:** TL adalah reviewer akhir; kartu TL perlu reviewer pengganti agar tidak self-review.
- **Rekomendasi:** Default: BE1 atau FE1 sesuai area kartu TL (misalnya kartu DB → BE1; kartu scaffolding umum → FE1). Ini `[ASSUMED Q-37]`.
- **Dampak jika berbeda:** team-and-process.md bagian Work Model.

## 4. Definition of Ready Verdict

**Invest scorecard:**

| Huruf | Skor | Alasan |
| --- | --- | --- |
| I (Independent) | PASS | US tersegregasi per alur (register, login, master, katalog, pinjam, kembalikan, reminder) |
| N (Negotiable) | PASS | Detail teknis (token QR, denda) adalah asumsi engineering, bukan kontrak kaku |
| V (Valuable) | PASS | Setiap US menyertakan Business Value verbatim |
| E (Estimable) | PASS | Estimasi tersedia per US; FE Sprint 1 109% sebagai risiko terbuka |
| S (Small) | WARN | US-09 dengan 10 AC dan 8 AC milik persona Admin melintasi persona; perlu dipecah |
| T (Testable) | WARN | Beberapa copy `[COPY-TBD Q-NN]` dan definisi metrik (Q-26) butuh konfirmasi agar test case dapat ditulis |

**Verdict:** Ready for Estimation, dengan blocker terbesar: Q-34 (konfirmasi 50 AC baseline) dan Q-32 (NFR resmi).

**Story-Splitting Suggestion:**

- US-09 (10 AC): pisahkan kartu Member (AC-09.01, AC-09.02, AC-09.06, AC-09.07) dan kartu Admin Perpus (AC-09.03, AC-09.04, AC-09.05, AC-09.08, AC-09.09, AC-09.10).
- US-08 (6 AC): pisahkan kartu Member (AC-08.01, AC-08.02, AC-08.04, AC-08.05) dan kartu Admin Perpus (AC-08.03, AC-08.06).

**Acceptance Criteria Gaps (usulan):**

| AC yang bermasalah | Usulan kata-kata yang bisa diuji |
| --- | --- |
| AC-01.01 (GIVEN terpotong: "mendafta") | "saya adalah pengguna baru yang ingin mendaftar" - BA konfirmasi teks GIVEN lengkap |
| AC-09.01 / AC-09.02 (section rekomendasi) | Tambahkan: "buku dengan rata-rata rating > 3 muncul di section Rekomendasi pada halaman Home" |
| AC-06.02 (≥5 hari belum terisi) | Tambahkan: "untuk keterlambatan ≥5 hari, kolom Biaya Denda dan Total Denda kosong sampai Admin mengisi" |
| AC-08.05 (tombol QR saat stok 0) | Tambahkan: "buku berstok 0 tampil label 'Tidak Tersedia' dan status tidak menampilkan tombol QR" |
| AC-06.01 (status di Dashboard) | Tambahkan metrik Dashboard enam butir (Q-26) sebagai referensi silang |

## 5. Refinement Summary

**Add (usulan):**
1. US baru: pembatalan peminjaman oleh Member dan kedaluwarsa Pending Peminjaman 24 jam (Q-16).
2. US baru: batas pinjaman aktif per Member / satu pinjaman aktif per judul (Q-17).
3. US baru: CRUD genre untuk Admin (Q-10).
4. AC baru: notifikasi badge unread / tandai dibaca (Q-29).

**Remove (usulan):**
1. Hapus catatan H27 di AC-06.02 (sudah tertutup AC-09.08 sampai AC-09.10) (Q-34).

**Edit (usulan):**
1. AC-01.03 sampai AC-01.05: ganti "Daftar" → "Next" (typo) (Q-05).
2. AC-02.01: ganti `newmember@gmail.com` → "nama saya" (typo) (Q-06).

Semua poin di atas **belum diterapkan** di `docs/business/`; hanya usulan menunggu sah oleh BA.

## 6. Prioritas untuk rapat BA (10 pertanyaan)

1. (Q-34) Konfirmasi bahwa 50 AC adalah baseline yang disetujui, dan hapus catatan H27 di AC-06.02.
2. (Q-33) Berikan akses review Figma atau konfirmasi bahwa teks AC sudah sinkron.
3. (Q-32) Berikan target NFR resmi (p95, load time, uptime, skala data).
4. (Q-34) Apakah tanggal approval 2025-12-07 sah padahal Start Date 2026-01-22?
5. (Q-02) Apakah akun Admin dibuat seeder atau lewat UI CRUD?
6. (Q-10) Berapa daftar genre awal untuk seeder, dan perlu CRUD genre?
7. (Q-16) Setujui usulan pembatalan/ekspirasi 24 jam untuk Pending Peminjaman, atau tahan tanpa?
8. (Q-06) Yang tampil di pojok kanan atas: Nama lengkap atau email?
9. (Q-08) Apakah Nomor Ponsel punya format khusus, atau hanya wajib diisi?
10. (Q-36) Setujui format Nomor Pinjaman `PJM-YYYYMMDD-####` dan format tanggal `d MMMM yyyy`.
