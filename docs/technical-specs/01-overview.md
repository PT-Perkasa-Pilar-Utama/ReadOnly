**Version:** 0.1
**Date:** 2026-11-05
**Author:** Tech Lead
**Status:** Draft
**Phase:** Technical Specification

# Technical Specification Overview - ReadOnly

## Terminology

> Semua istilah kanonik, label UI, dan pemetaan status didefinisikan di [GLOSSARY](../GLOSSARY.md). Istilah domain dan teks UI dari BA ditulis persis, tidak diterjemahkan.

## Language policy (P-04)

- Prosais dan teks UI: Indonesia.
- Identifier kode, path API, `code` error, nama branch, commit, dan teks PR: Inggris.
- Heading struktural skill tetap Inggris: Decision Matrix, What This Does NOT Do, Cross-References, Open Follow-ups.

## Goals

1. Mendigitalisasi dan mengotomatisasi administrasi peminjaman buku (tujuan bisnis).
2. Menyediakan katalog buku online yang mudah diakses.
3. Menyediakan sistem manajemen inventaris buku (Master Buku).
4. Menyediakan fitur peminjaman dan pengembalian mandiri bagi member.
5. Menyediakan notifikasi otomatis dan popup pengingat batas waktu guna meminimalisir keterlambatan.
6. Menyediakan Master Genre dengan status aktif/nonaktif.
7. Menyediakan pengelolaan akun Member dan Admin Perpus.

## Scope per modul

| Modus | Modul | AC / US yang dilayani |
| --- | --- | --- |
| Auth dan Management User | auth | US-01, US-02, US-03, US-12 (AC-01.01–AC-03.01, AC-12.01–AC-12.11) |
| Books dan Master Genre | books | US-05, US-07, US-11 (AC-05.01–AC-05.10, AC-07.01–AC-07.04, AC-11.01–AC-11.10) |
| Loans | loans, QR | US-08 (AC-08.01–AC-08.06) |
| Dashboard | dashboard | US-04 (AC-04.01) |
| Returns & fines | loans (kembali) | US-09 (AC-09.01–AC-09.10) |
| Notifications & scheduling | notifications, jobs | US-06 (AC-06.03), US-10 (AC-10.01–AC-10.08) |

## Out of Scope (Q-03)

- Forgot/reset password, ubah profil, atau ubah preferensi genre.
- Hapus akun.
- Peran selain Admin Perpus dan Member.
- Email, push notification, atau WebSocket.
- Pembatalan pinjaman.
- Pengelolaan akun di luar batas US-12, seperti reset password mandiri, hapus akun, dan perubahan role.
- Transcoding gambar cover.
- Payment gateway, cicilan, atau pembebasan denda.
- Pelacakan eksemplar per barcode.

## Basis pengguna

- **Admin Perpus:** mengelola buku dan genre, mengelola akun sesuai US-12, mengonfirmasi peminjaman lewat kamera browser, mengelola transaksi peminjaman, mencatat pembayaran denda, melihat Dashboard.
- **Member:** registrasi, login, jelajah (Home, Detail), ajukan peminjaman, tampilkan QR, terima reminder, kembalikan buku dengan rating.
- Skala provisional `[ASSUMED Q-32]`: 10.000 buku, 1.000 Member, 50.000 peminjaman.

## Alur kerja per peran (pseudocode)

```
// Member
register(1): form → Next → Pilih Genre → Daftar
login: email + password → Dashboard / beranda
browse: Home + Filter + pencarian → Detail Buku
borrow: Detail → Pinjam → Pending Peminjaman → QR → tunjukkan ke Admin
return: Pinjaman → Kembalikan → rating → Submit → status berubah
notifications: ikon Notifikasi → daftar notifikasi

// Admin Perpus
login: kredensial Admin Perpus → Dashboard
manage books: Master Buku → Add/Edit/Hapus (cover, filter, pencarian)
confirm loan: Dashboard → Scan QR → pratinjau → Konfirmasi Peminjaman
manage loans: Manajemen Peminjaman → detail → Konfirmasi Pengembalian / Pembayaran Denda
dashboard: 6 metric + pie chart
```

## Assumptions

1. Web app responsif; Admin memindai via kamera browser; QR ditunjukkan dari layar member (P-05, Q-01).
2. AC-12.02 menyediakan pembuatan akun Admin dari halaman Management User. Cara bootstrap Admin pertama belum ditetapkan.
3. Cover divalidasi (ekstensi/MIME/magic bytes, max 5 MiB) tetapi tidak ditranscoding (Q-13).
4. Stok adalah `available_count` atomik dengan CHECK >= 0 (Q-09).
5. Sesi server-side via cookie HttpOnly Secure SameSite=Lax (P-12).
6. Token QR 128 bit, hash di database, sekali pakai (Q-18).
7. Job harian 00:05 Asia/Jakarta, idempoten, Clock port injectable (Q-31).
8. Notifikasi tersedia di daftar in-app dan sebagai popup reminder saat login sesuai AC-10.04 sampai AC-10.08. Badge unread dan aksi tandai dibaca belum ditentukan.
9. Pustaka UI belum diputus; sinkronisasi Figma belum diverifikasi (Q-33).
10. NFR adalah target provisional karena sheet Business Value bukan milik ReadOnly (Q-32).

## Known Constraints

1. AC-01.01 masih memuat teks GIVEN "mendafta" pada spreadsheet terbaru.
2. Copy AC-01.03 sampai AC-01.06 menggunakan tombol "Daftar", sedangkan AC-01.08 menggunakan "Next"; jangan mengganti copy berdasarkan asumsi lama.
3. AC-02.01 menyebut `newmember@gmail.com` tampil di pojok kanan atas.
4. US-08 dan US-09 mencantumkan persona Member dan Admin; kartu dipisah sesuai aktor AC.
5. Tidak ada pembatalan/ekspirasi Pending Peminjaman pada v1 (Q-16).
6. Estimasi dan alokasi kartu belum mencakup 27 AC tambahan.

## Cross-References

- [docs/init/product_overview.md](../init/product_overview.md)
- [docs/init/user_story.md](../init/user_story.md)
- [docs/business/](../business/)
- [docs/api-specs/_index.md](../api-specs/_index.md)
- [docs/decisions/2026-11-06-grooming-final.md](../decisions/2026-11-06-grooming-final.md)
- [docs/GLOSSARY.md](../GLOSSARY.md)

## Open Follow-ups

Q-01, Q-08, Q-16, Q-17, Q-32, Q-33, Q-36, Q-37, bootstrap Admin pertama, serta sesi saat akun dinonaktifkan. Q-02, Q-06, Q-10, Q-29, Q-34, dan Q-35 diperbarui oleh grooming final.
