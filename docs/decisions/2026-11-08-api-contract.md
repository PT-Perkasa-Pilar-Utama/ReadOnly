**Version:** 1.0
**Date:** 2026-11-08
**Author:** Tech Lead
**Status:** Approved technical decision
**Phase:** API Specification

# API Contract Baseline - ReadOnly

## Keputusan

Tech Lead menetapkan kontrak API untuk Master Genre dan Management User di dokumen API; BE mengikuti keputusan tersebut dan FE menggunakan kontrak sebagai sumber integrasi. Persetujuan kontrak tidak berarti endpoint sudah diimplementasikan atau seluruh Acceptance Criteria telah masuk sprint.

Semua path di bawah memakai prefix `/api/v1`. Detail request, response, validasi, kode error, dan copy berada di dokumen API terkait.

## Kontrak yang disetujui

| Area | Method / path | Modul API | Traceability |
| --- | --- | --- | --- |
| Master Genre | `GET /admin/genres` | `books` | AC-11.01, AC-11.10 |
| Master Genre | `POST /admin/genres` | `books` | AC-11.02–AC-11.04 |
| Master Genre | `PATCH /admin/genres/:id` | `books` | AC-11.03–AC-11.07 |
| Master Genre | `DELETE /admin/genres/:id` | `books` | AC-11.08–AC-11.09 |
| Management User | `GET /admin/users` | `auth` | AC-12.01, AC-12.11 |
| Management User | `GET /admin/users/:id` | `auth` | AC-12.05 |
| Management User | `POST /admin/users` | `auth` | AC-12.02–AC-12.04 |
| Management User | `PATCH /admin/users/:id` | `auth` | AC-12.03, AC-12.05 |
| Management User | `PATCH /admin/users/:id/status` | `auth` | AC-12.06–AC-12.10 |

`GET /admin/users/:id` adalah route teknis untuk mengisi nilai awal form Edit User. Route ini mengembalikan alamat hanya pada halaman Management User terotorisasi; daftar user tidak mengirim alamat.

## Aturan kontrak

- Envelope sukses, error, pagination, dan kode status mengikuti [konvensi API](../api-specs/01-conventions.md).
- Copy pengguna yang ditetapkan AC harus dikembalikan persis. Nilai enum pada API memakai identifier Inggris, misalnya `active`/`inactive` dan `admin`/`member`; FE memetakan ke label UI sesuai AC.
- Operasi Master Genre dimiliki modul `books`; `genres` bukan modul API mandiri.
- Pencarian dan pagination memakai aturan query yang ditetapkan pada tiap operasi.
- Perubahan nama genre mempertahankan relasi berdasarkan ID. Hapus genre gagal dengan `409 genre_in_use` jika direferensikan buku atau preferensi Member.
- Operasi Management User tidak mengirim password/hash. Email dan role user tidak dapat diubah lewat Edit User. Penonaktifan akun memeriksa akun sendiri dan pinjaman aktif secara server-side.
- Daftar operasi dan status implementasi berada di [Operation Status Tracker](../api-specs/07-system.md). Semua endpoint baru tetap `TODO` pada kolom implementasi sampai kartu terkait selesai.

## Batas dan hal yang tetap terbuka

- Dokumen ini menetapkan kontrak teknis, bukan scope sprint. Story/AC committed tetap dipilih saat Sprint Planning.
- AC belum menetapkan perilaku sesi yang sudah aktif setelah akun dinonaktifkan; keputusan keamanan tersebut tetap terbuka dan tidak mengubah perilaku login berikutnya yang wajib menolak akun `inactive`.
- Perubahan kontrak setelah ini harus memperbarui dokumen API dan tracker, lalu dikomunikasikan ke FE dan BE sebelum implementasi.

## Rujukan

- [API conventions](../api-specs/01-conventions.md)
- [Books API: Master Genre](../api-specs/03-books.md)
- [Authentication API: Management User](../api-specs/02-authentication.md)
- [Operation Status Tracker](../api-specs/07-system.md)
- [Grooming final](2026-11-06-grooming-final.md)
- [Rundown PM satu sprint](2026-11-08-pm-sprint-timeline.md)
