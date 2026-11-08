**Version:** 0.1
**Date:** 2026-11-05
**Author:** Tech Lead
**Status:** Draft
**Phase:** Technical Specification

# Module Definitions - ReadOnly

Setiap modul didefinisikan dengan antarmuka (invarian, mode error, urutan, konfigurasi), entitas yang dimiliki, seam/adapter, dan alasan kedalaman.

## auth

- **Tanggung jawab:** registrasi (2 langkah), login, sesi cookie, logout, serta Management User sesuai US-12. Pilihan genre aktif dikonsumsi dari modul `books`.
- **Entitas:** `users` (password_hash, role, status), `sessions` (P-12), `user_genres`.
- **AC/US:** US-01, US-02, US-03, US-12 (AC-01.01–AC-03.01, AC-12.01–AC-12.11).
- **Seam/adapter:** Storage tidak dipakai (gambar profil tidak ada). Clock dipakai untuk rotasi sesi.
- **Invarian:** hash password bcrypt; sesi mati saat logout; rate limit login.
- **Mengapa deep:** entitas users/sessions memiliki konsistensi tinggi; operasi ini sentral.

## books

- **Tanggung jawab:** CRUD buku, CRUD/status Master Genre, validasi cover, pencarian/filter, rata-rata rating, dan ketersediaan.
- **Entitas:** `books`, `genres` (termasuk status Master Genre), `book_genres`, `cover_path` (via Storage port), `ratings` (milik buku).
- **AC/US:** US-05, US-07, US-11 (AC-05.01–AC-05.10, AC-07.01–AC-07.04, AC-11.01–AC-11.10).
- **Seam:** Storage port (upload/present/detach); Clock untuk perhitungan.
- **Invarian:** judul ada; cover valid bila di-upload; `available_count >= 0`.
- **Mengapa deep:** stok adalah seam paling kritis (lihat spek 13).

## loans

- **Tanggung jawab:** lifecycle peminjaman, QR token, confirm, return, denda, admin list.
- **Entitas:** `loans`, `loan_events` (append-only), `qr_token_hash`.
- **AC/US:** US-08, US-09, US-06 (AC-08.01–AC-08.06, AC-09.01–AC-09.10, AC-06.01–AC-06.03).
- **Seam:** books (conditional decrement/increment), notifications (insert), Clock.
- **Invarian:** status hanya berubah lewat fungsi service; stok atomik dengan status; token sekali pakai.
- **Mengapa deep:** lifecycle peminjaman adalah seam paling kritis kedua (lihat spek 12).

## notifications

- **Tanggung jawab:** model notifikasi, tiga tipe notifikasi yang sudah ditetapkan, template, daftar member, serta data untuk popup reminder AC-10.04–AC-10.08.
- **Entitas:** `notifications` (unique per (loan, type)).
- **AC/US:** US-10 (AC-10.01–AC-10.08), US-06 (AC-06.03).
- **Seam:** Clock; loans (read).
- **Invarian:** unik per (loan, type); job membuat, endpoint hanya membaca.

## dashboard

- **Tanggung jawab:** 6 metrik, pie chart tepat waktu vs terlambat.
- **Entitas:** read-only atas loans + books.
- **AC/US:** US-04 (AC-04.01).
- **Seam:** read-only; seed QA menentukan nilai harapan.
- **Mengapa deep:** definisi metrik (Q-26) butuh konsistensi agar tes QA benar.

## jobs

- **Tanggung jawab:** job harian 00:05 WIB: ubah status Terlambat, buat notifikasi DUE_SOON/DUE_TODAY/OVERDUE.
- **Entitas:** `job_runs`.
- **AC/US:** US-06 (AC-06.03), US-10 (AC-10.01–AC-10.03).
- **Seam:** advisory lock (idempoten), Clock (injectable), notifications.
- **Invarian:** satu eksekusi per hari; catch-up saat start; status beku saat return_requested_at.

## system

- **Endpoint operasional:** `GET /health` (rincian per dependensi), `POST /admin/reset-state` (seed dev/QA, hanya non-prod).
- **AC/US:** operasional (tidak ada US/AC).
- **Invarian:** `/health` dibatasi detail; `reset-state` tidak terdaftar di production.

## Seam stok: loans ↔ books

**Desain teliti:** semua perubahan stok harus atomik bersama perubahan status, dalam satu transaksi:

1. `POST /admin/loans/qr/confirm` → BEGIN → `UPDATE books SET available_count = available_count - 1 WHERE id = ? AND available_count > 0` → INSERT loans status berubah → INSERT loan_events → COMMIT. Bila 0 rows updated → abort → HTTP 409.
2. `POST /admin/loans/:id/return-confirmation` → BEGIN → UPDATE books +1 → UPDATE loans status → COMMIT.
3. Semua baris di atas terjadi dalam satu transaksi; `loan_events` mencatat setiap transisi.

## What This Does NOT Do

- Tidak ada modul `ratings` atau `genres` yang berdiri sendiri (lihat 03-repository-structure).
- Pengelolaan user terbatas pada AC-12.01 sampai AC-12.11. Genre dikelola melalui modul yang sudah ada, bukan modul `genres` terpisah.

## Cross-References

- [03-repository-structure.md](03-repository-structure.md)
- [06-data-model.md](06-data-model.md)
- [12-loan-lifecycle-and-fines.md](12-loan-lifecycle-and-fines.md)
- [13-stock-integrity-and-concurrency.md](13-stock-integrity-and-concurrency.md)

## Open Follow-ups

Q-31 (implementasi Clock port yang tepat), Q-15 (pesan HTTP 409), Q-18 (implementasi QR).
