**Version:** 1.0
**Date:** 2026-11-06
**Author:** Tech Lead
**Status:** Current grooming baseline
**Phase:** Backlog Grooming

# Final Grooming Delta - ReadOnly

Dokumen ini mencatat hasil grooming Jumat, 6 November 2026, berdasarkan spreadsheet yang diberikan sebagai hasil final:

[Doc_BA_ReadOnly_Versi 1 (Versi Revisi Adi)](https://docs.google.com/spreadsheets/d/13cAZkljeFtunPfI0eLJPtjLBEO8PaT1i2Qc0fxxaDZg/edit?gid=0#gid=0)

Dokumen ini menggantikan asumsi engineering 5 November bila keduanya bertentangan. Dokumen bisnis dan spek terkait perlu disinkronkan dengan baseline ini. Catatan ini tidak membuat AC baru di luar yang tercantum pada spreadsheet.

## 1. Baseline terbaru

- User Story: **12** (US-01 sampai US-12).
- Acceptance Criteria: **77**. Baseline sebelumnya memuat 50 AC; spreadsheet terbaru menambahkan 27 AC.
- Persetujuan pada tab `BA Approval` masih mencatat tanggal 7 Desember 2025 dan komentar "US & AC looks good, next to UIUX Stage". Tanggal persetujuan tersebut mendahului perubahan terbaru. Spreadsheet ini dipakai sebagai hasil grooming final atas arahan pemilik proyek, tetapi tanggal approval untuk tambahan US-11, US-12, dan AC terkait perlu diperbarui bila proses BA memerlukannya.
- Tab `Business Value` memuat metrik produk HRIS/penilaian kinerja, bukan ReadOnly. Metrik itu tidak menjadi NFR atau acceptance criteria ReadOnly.

## 2. Tambahan scope dari spreadsheet

| Area | ID baru | Perubahan |
| --- | --- | --- |
| Master Buku | AC-05.10 | Buku yang memakai genre nonaktif tetap dapat diedit tanpa mengganti genre tersebut. |
| Reminder | AC-10.04 sampai AC-10.08 | Popup reminder saat login, penutupan popup, urutan beberapa kondisi, dan persistensi reminder di daftar notifikasi. |
| Master Genre | US-11, AC-11.01 sampai AC-11.10 | Daftar, tambah, ubah, aktif/nonaktif, hapus dengan guard pemakaian, serta pencarian genre. |
| Management User | US-12, AC-12.01 sampai AC-12.11 | Daftar dan pencarian/filter user, tambah Admin, edit data, aktif/nonaktif, serta guard akun dan pinjaman aktif. |

Rincian skenario dan hasil yang tampak oleh pengguna ada di [acceptance-criteria-addendum.md](../business/acceptance-criteria-addendum.md).

## 3. Keputusan terdahulu yang digantikan atau diperbarui

| Pertanyaan lama | Status pada hasil terbaru | Dampak |
| --- | --- | --- |
| Q-02: Admin dibuat hanya melalui seeder | Diperbarui. AC-12.02 mengharuskan Admin dapat menambahkan akun Admin. Cara bootstrap Admin pertama belum dijelaskan. | Pertahankan kebutuhan bootstrap awal sebagai keputusan operasional terbuka; tambah alur kelola akun Admin. |
| Q-05: validasi register dilakukan pada tombol Next | Jangan mengubah copy AC berdasarkan asumsi lama. Spreadsheet tetap menyebut tombol `Daftar` pada AC-01.03 sampai AC-01.06, dan `Next` pada AC-01.08. | Implementasi perlu mengikuti teks sumber atau meminta klarifikasi BA bila alur tampak bertentangan. |
| Q-06: nama lengkap tampil di pojok kanan atas | Digantikan teks AC-02.01 yang menyebut `newmember@gmail.com` di pojok kanan atas. | Jangan mengganti teks itu menjadi nama lengkap tanpa revisi sumber. |
| Q-10: genre hanya dari seeder, tanpa CRUD | Digantikan oleh US-11. Master Genre menyediakan CRUD, status Aktif/Nonaktif, pencarian, dan guard hapus. | Genre tetap bukan modul API mandiri; letakkan kepemilikan dalam modul yang sudah ada dan perbarui skema. |
| Q-29: notifikasi hanya daftar tanpa popup | Diperluas oleh AC-10.04 sampai AC-10.08. | Implementasikan popup per login dan daftar notifikasi. AC belum meminta aksi tandai dibaca atau badge jumlah unread. |
| Q-34: 50 AC sebagai baseline | Baseline yang dipakai kini 12 US dan 77 AC dari spreadsheet terbaru. | Dokumen breakdown dan task lama belum mencakup 27 AC baru. |
| Q-35: US-08 dan US-09 hanya persona Member | Spreadsheet mencantumkan persona `Member, Admin` untuk kedua US. | Kartu tetap dipisah sesuai aktor masing-masing AC. |

Q-ID lain dari grooming lama tetap terbuka kecuali dijawab langsung oleh AC terbaru. Grooming lama tetap disimpan sebagai riwayat, bukan sebagai keputusan aktif untuk area di atas.

## 4. Dampak dokumen dan implementasi

1. Tambahkan US-11 dan US-12 ke daftar user story dan dokumentasikan 27 AC baru.
2. Perbarui model `genres` dengan status Aktif/Nonaktif dan model `users` dengan status akun. Kebijakan hard-delete genre hanya boleh mengikuti AC-11.08/11.09: genre yang masih dipakai buku atau preferensi user tidak dapat dihapus.
3. Perbarui otorisasi Admin untuk Master Genre dan Management User. AC-12.06, AC-12.09, dan AC-12.10 menetapkan guard nonaktif akun sendiri dan akun dengan pinjaman belum dikembalikan.
4. Perbarui aturan privasi. AC-12.01 meminta Admin melihat nomor ponsel pada halaman Management User; larangan PII pada log dan dashboard tetap berlaku. Akses tersebut harus dibatasi ke halaman dan peran yang ditetapkan.
5. Perluas reminder UI untuk AC-10.04 sampai AC-10.08. Urutan popup saat ada beberapa kondisi: terlambat, jatuh tempo hari ini, lalu 1 sampai 3 hari lagi. Menutup popup tidak menghapus notifikasi dari daftar.
6. Pada saat grooming, kontrak API awal dilengkapi rancangan 4 operasi Master Genre dan 4 operasi Management User. Tindak lanjut 8 November menetapkan path dan skema 9 operasi terkait (termasuk detail user untuk form Edit); lihat [keputusan kontrak API](2026-11-08-api-contract.md). Seed QA, coverage AC, kartu kerja, estimasi, dan pilihan scope sprint tetap mengikuti planning; jangan menganggap kartu lama sudah mencakup baseline 77 AC.

## 5. Hal yang belum diputuskan oleh sumber terbaru

- NFR ReadOnly yang resmi. Tab `Business Value` tidak dapat dipakai karena berisi metrik HRIS.
- Status verifikasi Figma dan pilihan pustaka UI.
- Batas jumlah pinjaman aktif per Member dan kebijakan pembatalan/kedaluwarsa `PENDING`.
- Kebijakan bootstrap dan pemulihan akun Admin pertama.
- Apakah penonaktifan user harus membatalkan sesi yang masih aktif.
- Scope, prioritas, PIC task, dan estimasi story point untuk satu sprint PM; pemilihannya dijadwalkan pada Sprint Planning. Lihat [timeline PM](2026-11-08-pm-sprint-timeline.md).
- Waktu persetujuan BA untuk perubahan pada spreadsheet terbaru.

## 6. Rujukan

- [Grooming 5 November (riwayat)](2026-11-05-grooming-readonly.md)
- [User Story](../business/user-story.md)
- [Acceptance Criteria Index](../business/acceptance-criteria.md)
- [Acceptance Criteria Addendum](../business/acceptance-criteria-addendum.md)
- [Task Breakdown historis](../task-breakdown/_index.md)
- [Timeline satu sprint dari PM](2026-11-08-pm-sprint-timeline.md)
