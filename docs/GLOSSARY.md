**Version:** 0.1  
**Date:** 2026-11-05  
**Author:** Tech Lead  
**Status:** Draft  
**Phase:** Foundations  

# Glossary - ReadOnly

Terminologi kanonik untuk sistem perpustakaan digital ReadOnly. Label UI ditulis persis seperti di Acceptance Criteria; identifier kode menggunakan padanan bahasa Inggris.

## 1. Persona

| Istilah Dokumen | Padanan Kode | Deskripsi |
| --- | --- | --- |
| **Admin Perpus** | `admin` | Pengelola perpustakaan: mengelola Master Buku, Master Genre, dan Management User; memindai QR peminjaman melalui kamera, mengonfirmasi pengembalian, mencatat pembayaran denda, dan melihat ringkasan Dashboard (US-04–US-06, US-11, US-12). |
| **Member** | `member` | Pengguna umum perpustakaan: mendaftar, memilih genre favorit, menjelajah buku, mengajukan peminjaman, menampilkan QR Code, menerima reminder, serta mengembalikan buku disertai rating (US-01, US-07–US-10). |

## 2. Enam Status Peminjaman

| Label UI (Persis AC) | Kode Database / API | Deskripsi |
| --- | --- | --- |
| **Pending Peminjaman** | `PENDING` | Member telah mengajukan peminjaman via aplikasi web; menunggu persetujuan Admin via scan QR. Stok fisik belum berkurang (Q-15). |
| **Sedang Dipinjam** | `BORROWED` | Peminjaman telah disetujui Admin melalui pemindaian QR Code valid. Stok `available_count` berkurang 1 (AC-08.03). |
| **Terlambat** | `OVERDUE` | Peminjaman telah melewati batas pengembalian (`due_date < now`). Status diubah otomatis oleh job harian 00:05 WIB (AC-06.03). |
| **Pending Pengembalian** | `RETURN_PENDING` | Member berstatus *Sedang Dipinjam* telah menekan tombol "Kembalikan" dan mengisi rating 1–5 (AC-09.01). `late_days` dibekukan (Q-24). |
| **Pending Keterlambatan** | `FINE_PENDING` | Member berstatus *Terlambat* telah menekan tombol "Kembalikan" dan mengisi rating 1–5 (AC-09.02). `late_days` dibekukan (Q-24); menunggu penyelesaian denda. |
| **Sudah Dikembalikan** | `RETURNED` | Buku telah diterima fisik oleh Admin dan dikonfirmasi di sistem. Stok `available_count` bertambah 1 secara atomik (AC-09.03, AC-09.05). Keadaan terminal. |

## 3. Istilah Denda dan Pembayaran (Q-20, Q-21, Q-22)

| Istilah | Nilai / Bentuk | Deskripsi |
| --- | --- | --- |
| **Denda 1–4 Hari** | Rp 2.000 flat | Keterlambatan 1 s/d 4 hari kalender WIB dikenakan tarif flat Rp 2.000 total (AC-09.04). Admin disajikan konfirmasi alert. |
| **Denda ≥ 5 Hari** | Input manual (1..99.999.999) | Keterlambatan 5 hari atau lebih memerlukan input manual biaya denda oleh Admin melalui Pop Up "Biaya Denda" (AC-09.08). |
| **Status Pembayaran Denda** | `Belum Bayar`, `Sudah Bayar` | Flag status pelunasan denda oleh Member (Q-21). Konfirmasi pengembalian buku terlambat mensyaratkan status `Sudah Bayar`. |
| **Metode Pembayaran** | Tunai di tempat | Pembayaran denda dilakukan langsung secara tunai ke Admin Perpus; sistem mencatat timestamp dan admin aktor (Q-23). |

## 4. Tipe Notifikasi Reminder (US-10)

| Tipe Notifikasi | Teks Pesan UI (Persis AC) | Pemicu |
| --- | --- | --- |
| `DUE_TODAY` | "{judul_buku} sudah mencapai tenggat waktu peminjaman. Silahkan Dikembalikan" | Job harian: pada tanggal batas, status masih Sedang Dipinjam (AC-10.01). |
| `DUE_SOON_3D` | "Batas pengembalian 3 hari lagi" + "{judul_buku} perlu dikembalikan paling lambat {tanggal_batas_pengembalian}." | Job harian: 3 hari sebelum batas (AC-10.02). Format tanggal `[COPY-TBD Q-36]`. |
| `OVERDUE` | "Buku melewati batas pengembalian" + "{judul_buku} jatuh tempo pada {tanggal_batas_pengembalian}. Segera ajukan pengembalian." | Job harian: saat status menjadi Terlambat (AC-10.03). |

## 5. Domain Entitas Buku

| Istilah | Padanan Kode | Deskripsi |
| --- | --- | --- |
| **Buku** | `books` | Entitas judul buku yang tercatat di katalog, memuat judul, penulis, deskripsi, cover, total eksemplar, dan ketersediaan. |
| **Ketersediaan** | `available_count` | Jumlah eksemplar buku yang sedang tersedia untuk dipinjam di rak perpustakaan. Menggunakan CHECK constraint `>= 0` (Q-09). |
| **Cover Buku** | `cover_path` | Berkas gambar sampul buku (format PNG/JPG, maks 5 MiB) disimpan di storage lokal terisolasi (SEC-05, AC-05.03, AC-05.04). |
| **Genre** | `genres` | Kategori minat buku yang dapat dikelola Admin melalui Master Genre (US-11); pilihan baru hanya memakai genre berstatus Aktif. Genre Nonaktif yang sudah dipakai buku atau preferensi Member tetap dipertahankan (AC-05.10, AC-11.06–AC-11.09). |
| **Rating & Feedback** | `ratings` | Penilaian bintang 1 s/d 5 yang wajib diisi Member saat mengajukan pengembalian buku (AC-09.06). |

## 6. Status Genre dan Akun

| Istilah | Padanan Kode | Deskripsi |
| --- | --- | --- |
| **Genre Aktif / Nonaktif** | `genres.status` | Status yang mengatur apakah genre tersedia untuk pilihan baru. Nonaktif bukan penghapusan; data buku dan preferensi Member yang sudah ada tetap terhubung (AC-11.06, AC-11.07). |
| **Akun Aktif / Nonaktif** | `users.status` | Akun Nonaktif tidak dapat login. Admin dapat mengaktifkan kembali akun; akun sendiri dan akun dengan peminjaman belum dikembalikan memiliki guard penonaktifan (AC-12.06–AC-12.10). |
| **Management User** | `auth` | Halaman Admin untuk melihat, mencari, memfilter, menambah Admin, mengubah data terbatas, serta mengaktifkan/menonaktifkan akun (US-12). |

## 7. Komponen Teknis

| Istilah | Konsep |
| --- | --- |
| **Clock Port** | Abstraksi waktu sistem agar pengujian unit/e2e dapat memanipulasi waktu tanpa mengubah jam OS server. |
| **Storage Port** | Abstraksi penyimpanan berkas cover buku agar implementasi lokal dan volume Docker terisolasi. |
| **Advisory Lock** | Mekanisme penguncian di tingkat PostgreSQL (`pg_try_advisory_lock`) untuk mencegah job scheduler dieksekusi ganda. |
| **Reset State** | Endpoint khusus lingkungan non-produksi (`POST /admin/reset-state`) untuk mengembalikan database ke kondisi seed dev/QA. |

## Cross-References

- [technical-specs/12-loan-lifecycle-and-fines.md](technical-specs/12-loan-lifecycle-and-fines.md)
- [technical-specs/06-data-model.md](technical-specs/06-data-model.md)
- [api-specs/01-conventions.md](api-specs/01-conventions.md)
