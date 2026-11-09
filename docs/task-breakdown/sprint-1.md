# Sprint 1: Task Breakdown ReadOnly

> **Isi file:** Menggabungkan seluruh kartu yang sebelumnya berada di `sprint-1.md`, `sprint-2.md`, dan `sprint-3.md`. Prefix ID `S1`, `S2`, dan `S3` dipertahankan demi traceability. Kelompok dan estimasi di bawah adalah baseline engineering, bukan komitmen scope sprint PM. Tim memilih kartu aktif saat Sprint Planning berdasarkan kapasitas ([rundown PM](../decisions/2026-11-08-pm-sprint-timeline.md)).
>
> **PIC:** Owner mencantumkan PIC sesuai pembagian pada spreadsheet. Kartu yang mencakup US dengan PIC berbeda mencantumkan keduanya. `FE-S1-01` tidak terikat pada US tertentu; penempatan pada Darrel adalah asumsi untuk pekerjaan shell lintas fitur.

## PIC per User Story

Semua AC dalam satu US mengikuti PIC pada tabel ini. Kolom BE pada screenshot tampak digabung untuk seluruh daftar US, sehingga Semi dicatat untuk US-01 sampai US-12.

| User Story | PIC BE | PIC FE |
| --- | --- | --- |
| US-01 | Semi | Darrel |
| US-02 | Semi | Darrel |
| US-03 | Semi | Darrel |
| US-04 | Semi | Raden Mahesa |
| US-05 | Semi | Raden Mahesa |
| US-06 | Semi | Raden Mahesa |
| US-07 | Semi | Darrel |
| US-08 | Semi | Raden Mahesa |
| US-09 | Semi | Raden Mahesa |
| US-10 | Semi | Darrel |
| US-11 | Semi | Raden Mahesa |
| US-12 | Semi | Darrel |

## Kelompok 1: Fondasi, Autentikasi, Master Buku, Master Genre, dan Management User

Stories: US-01, US-02, US-03, US-05, US-11, US-12  
Goal: Siapkan skema penuh, akun member dan admin, sesi, serta pengelolaan Master Buku, Master Genre, dan Management User.

### Backend

| Card ID | PM Card Title | Task Description | AC | Owner | Est | Docs |
| --- | --- | --- | --- | --- | --- | --- |
| TL-S1-01 | Scaffold monorepo + gate commands | Setup Bun workspaces, Biome, TypeScript strict, error envelope, Clock port, Storage port, Compose dev, GET /health. Berlaku setelah kartu ini: biome, tsc, bun test. (**Selesai**) | - | TL | 1.0d | [03-repository-structure](../technical-specs/03-repository-structure.md), [11-environment-configuration](../technical-specs/11-environment-configuration.md) |
| DB-S1-01 | Schema + migrate + seed + constants | Drizzle schema & migrasi seluruh tabel (`users` dgn `status`, `sessions`, `genres` dgn `status`, `user_genres`, `books`, `book_genres`, `loans`, `loan_events`, `ratings`, `notifications`, `job_runs`), `packages/shared/src/constants.ts`, serta seeder dev/qa idempoten. | - | TL | 0.5d | [06-data-model](../technical-specs/06-data-model.md), [12-loan-lifecycle-and-fines](../technical-specs/12-loan-lifecycle-and-fines.md) |
| BE-S1-01 | Register two-step + active genres | `POST /auth/register/validate`, `POST /auth/register`, dan `GET /genres` (hanya genre `active`): mandatory, email format, confirm match, uniqueness 409, genre wajib, bcrypt, rate limit. | AC-01.02, AC-01.03, AC-01.04, AC-01.05, AC-01.06, AC-01.07, AC-01.08 | Semi | 1.0d | [02-authentication](../api-specs/02-authentication.md#post-authregistervalidate-q-05), [09-authentication-and-authorization](../technical-specs/09-authentication-and-authorization.md) |
| BE-S1-02 | Login, session, logout, inactive check | `POST /auth/login` (termasuk tolak akun `inactive` 403 sesuai AC-12.07), `GET /auth/me`, `POST /auth/logout`, cookie HttpOnly, rate limit, RBAC middleware (`requireAuth`, `requireRole`). | AC-02.01, AC-02.02, AC-02.03, AC-02.04, AC-02.05, AC-03.01, AC-12.07 | Semi | 1.0d | [02-authentication](../api-specs/02-authentication.md#post-authlogin), [07-security](../technical-specs/07-security.md) |
| BE-S1-03 | Master Buku CRUD + cover + inactive genre | `GET/POST/PATCH/DELETE /admin/books`, upload cover Storage port, search/filter, soft-delete guard (Q-11), dan dukungan simpan buku lama dengan genre nonaktif tanpa perubahan (AC-05.10). | AC-05.01, AC-05.02, AC-05.03, AC-05.04, AC-05.05, AC-05.06, AC-05.07, AC-05.08, AC-05.09, AC-05.10 | Semi | 2.5d | [03-books](../api-specs/03-books.md), [17-cover-upload-and-storage](../technical-specs/17-cover-upload-and-storage.md), [13-stock-integrity-and-concurrency](../technical-specs/13-stock-integrity-and-concurrency.md) |
| BE-S1-04 | Master Genre CRUD & status (US-11) | `GET /admin/genres`, `POST /admin/genres`, `PATCH /admin/genres/:id`, `DELETE /admin/genres/:id` di modul `books`: trim & case-insensitive unique check, toggle `active`/`inactive`, hard-delete guard `409 genre_in_use` bila dipakai buku atau preferensi Member. | AC-11.01, AC-11.02, AC-11.03, AC-11.04, AC-11.05, AC-11.06, AC-11.07, AC-11.08, AC-11.09, AC-11.10 | Semi | 1.25d | [03-books](../api-specs/03-books.md#api-contract-master-genre-us-11), [2026-11-08-api-contract](../decisions/2026-11-08-api-contract.md) |
| BE-S1-05 | Management User Admin (US-12) | `GET /admin/users`, `GET /admin/users/:id`, `POST /admin/users`, `PATCH /admin/users/:id`, `PATCH /admin/users/:id/status` di modul `auth`: tambah Admin, edit terbatas (email/role terkunci), aktif/nonaktif dengan guard akun sendiri (`cannot_deactivate_self`) & pinjaman aktif (`account_has_active_loans`). | AC-12.01, AC-12.02, AC-12.03, AC-12.04, AC-12.05, AC-12.06, AC-12.07, AC-12.08, AC-12.09, AC-12.10, AC-12.11 | Semi | 1.25d | [02-authentication](../api-specs/02-authentication.md#api-contract-management-user-us-12), [2026-11-08-api-contract](../decisions/2026-11-08-api-contract.md) |

### Frontend

| Card ID | PM Card Title | Task Description | AC | Owner | Est | Docs |
| --- | --- | --- | --- | --- | --- | --- |
| FE-S1-01 | Shell, router guard, API client | Layout responsif, navigasi per peran (`member` vs `admin`), guard autentikasi, typed API client di `apps/web/src/api/`, pemetaan error envelope. | - | Darrel | 2.0d | [03-repository-structure](../technical-specs/03-repository-structure.md), [09-authentication-and-authorization](../technical-specs/09-authentication-and-authorization.md) |
| FE-S1-02 | Register two-step UI | Form langkah 1 (6 field, tombol `"Next"`), Pilih Genre multitag aktif (tombol `"Daftar"`), pesan inline verbatim (termasuk teks `mendafta` bila ditampilkan). | AC-01.01, AC-01.02, AC-01.03, AC-01.04, AC-01.05, AC-01.06, AC-01.07, AC-01.08 | Darrel | 1.5d | [02-authentication](../api-specs/02-authentication.md) |
| FE-S1-03 | Login, email header, logout | Form login, validasi verbatim (termasuk pesan akun nonaktif AC-12.07), email ditampilkan di pojok kanan atas sesuai AC-02.01, redirect per peran, tombol Logout. | AC-02.01, AC-02.02, AC-02.03, AC-02.04, AC-02.05, AC-03.01, AC-12.07 | Darrel | 1.25d | [02-authentication](../api-specs/02-authentication.md#post-authlogin) |
| FE-S1-04 | Master Buku UI + genre nonaktif | Tabel Master Buku, form Add/Edit upload cover, penanda `Nonaktif` pada genre lama saat Edit (AC-05.10), hapus dengan alert rekonfirmasi, Filter Penulis/Genre Aktif, pencarian. | AC-05.01, AC-05.02, AC-05.03, AC-05.04, AC-05.05, AC-05.06, AC-05.07, AC-05.08, AC-05.09, AC-05.10 | Raden Mahesa | 2.5d | [03-books](../api-specs/03-books.md) |
| FE-S1-05 | Master Genre UI (US-11) | Halaman `Master Genre`: tabel (Nama Genre, Jumlah Buku, Status, Action), pencarian (`Genre tidak ditemukan`), form Add/Edit, alert konfirmasi Nonaktifkan & Hapus, pesan sukses/error verbatim. | AC-11.01, AC-11.02, AC-11.03, AC-11.04, AC-11.05, AC-11.06, AC-11.07, AC-11.08, AC-11.09, AC-11.10 | Raden Mahesa | 1.25d | [03-books](../api-specs/03-books.md#api-contract-master-genre-us-11), [acceptance-criteria-addendum](../business/acceptance-criteria-addendum.md#us-11-master-genre-admin-perpus) |
| FE-S1-06 | Management User UI (US-12) | Halaman `Management User`: tabel (Nama Lengkap, Email, Nomor Ponsel, Role, Status, Action), pencarian & filter Role (`User tidak ditemukan`), form `Add Admin`, form `Edit User` (Email & Role read-only), disable tombol `Nonaktifkan` pada diri sendiri (AC-12.09), alert konfirmasi & pesan guard pinjaman aktif. | AC-12.01, AC-12.02, AC-12.03, AC-12.04, AC-12.05, AC-12.06, AC-12.07, AC-12.08, AC-12.09, AC-12.10, AC-12.11 | Darrel | 1.25d | [02-authentication](../api-specs/02-authentication.md#api-contract-management-user-us-12), [acceptance-criteria-addendum](../business/acceptance-criteria-addendum.md#us-12-management-user-admin-perpus) |
| FE-S1-07 | Wiring E2E: Auth, Master Buku, Genre, User | Depends on FE-S1-02..06 & BE-S1-01..05. Kriteria exit: Playwright E2E menguji register 2 langkah, login Member/Admin/Nonaktif, logout, CRUD Master Buku + genre nonaktif (AC-05.10), Master Genre CRUD/guard hapus (US-11), dan Management User tambah Admin/edit/guard nonaktif (US-12). | AC-01.06, AC-01.08, AC-02.02, AC-02.03, AC-02.04, AC-02.05, AC-03.01, AC-05.03, AC-05.04, AC-05.09, AC-05.10, AC-11.04, AC-11.09, AC-12.07, AC-12.09, AC-12.10 | Darrel + Raden Mahesa | 1.5d | [02-authentication](../api-specs/02-authentication.md), [03-books](../api-specs/03-books.md) |

## Kelompok 2: Katalog Member, Peminjaman dengan QR, dan Dashboard Admin

Stories: US-07, US-08, US-04

Goal: Member dapat menjelajah dan mengajukan peminjaman; Admin dapat mengonfirmasi peminjaman lewat kamera browser; Dashboard menampilkan enam metrik.

### Backend

| Card ID | PM Card Title | Task Description | AC | Owner | Est | Docs |
| --- | --- | --- | --- | --- | --- | --- |
| BE-S2-01 | Catalog Home + detail | GET /books (filter, search, paginasi 10, rekomendasi genre), GET /books/:id. | AC-07.01, AC-07.02, AC-07.03, AC-07.04, AC-08.04 | Semi | 1.5d | [03-books](../api-specs/03-books.md#get-books-katalog-home-member), [16-catalog-search-filter-and-recommendations](../technical-specs/16-catalog-search-filter-and-recommendations.md) |
| BE-S2-02 | Ajukan pinjam + token QR | POST /loans, GET /loans/me, GET /loans/:id/qr (token 128 bit hash sekali pakai). | AC-08.01, AC-08.02, AC-08.05 | Semi | 1.5d | [04-loans](../api-specs/04-loans.md#post-loans-ajukan-peminjaman-member), [14-qr-borrow-confirmation](../technical-specs/14-qr-borrow-confirmation.md) |
| BE-S2-03 | QR confirm + stock decrement | POST /admin/loans/qr/preview dan confirm: conditional decrement stok, single-use, 409 saat habis. | AC-08.03, AC-08.06 | Semi | 1.0d | [04-loans](../api-specs/04-loans.md#post-adminloansqrconfirm-konfirmasi-sekali-pakai), [13-stock-integrity-and-concurrency](../technical-specs/13-stock-integrity-and-concurrency.md) |
| BE-S2-04 | Dashboard summary | GET /admin/dashboard/summary enam metrik + pie chart (Q-26). | AC-04.01 | Semi | 1.0d | [06-dashboard](../api-specs/06-dashboard.md#get-admindashboardsummary) |

### Frontend

| Card ID | PM Card Title | Task Description | AC | Owner | Est | Docs |
| --- | --- | --- | --- | --- | --- | --- |
| FE-S2-01 | Home + detail buku | Halaman Home (rekomendasi, kartu buku, label Tersedia/Tidak Tersedia, Filter, cari, ikon Notif), Detail Buku ("Pinjam"). | AC-07.01, AC-07.02, AC-07.03, AC-07.04, AC-08.04 | Darrel + Raden Mahesa | 3.0d | [03-books](../api-specs/03-books.md) |
| FE-S2-02 | Pinjaman + QR member | Halaman Pinjaman (daftar, aksi sesuai status), pop up "QR Code Peminjaman". | AC-08.01, AC-08.02, AC-08.05 | Raden Mahesa | 1.5d | [04-loans](../api-specs/04-loans.md), [14-qr-borrow-confirmation](../technical-specs/14-qr-borrow-confirmation.md) |
| FE-S2-03 | Dashboard Admin + scan QR | Enam metrik, pie chart, tombol "Scan QR", pop up scanner kamera, pop up "Konfirmasi Peminjaman". | AC-04.01, AC-08.03, AC-08.06 | Raden Mahesa | 2.0d | [06-dashboard](../api-specs/06-dashboard.md), [04-loans](../api-specs/04-loans.md) |
| FE-S2-04 | Wiring: borrow flow e2e | Depends on FE-S2-02, FE-S2-03, BE-S2-03; FE selesai terakhir sehingga FE memiliki kartu wiring. Kriteria exit: Playwright E2E menguji alur dua konteks browser Member lalu Admin sampai "Sedang Dipinjam" dan stok berkurang 1; QR tidak valid (AC-08.06); stok habis (AC-08.04); dua Member merebut stok terakhir (Q-15). | AC-08.03, AC-08.04, AC-08.06 | Raden Mahesa | 1.5d | [04-loans](../api-specs/04-loans.md), [14-qr-borrow-confirmation](../technical-specs/14-qr-borrow-confirmation.md) |

## Kelompok 3: Manajemen Peminjaman, Pengembalian dan Denda, serta Reminder & Popup Login

Stories: US-06, US-09, US-10

Goal: Selesaikan siklus peminjaman: pengembalian, denda otomatis/manual, perubahan status otomatis harian, daftar notifikasi, dan popup pengingat saat login.

### Backend

| Card ID | PM Card Title | Task Description | AC | Owner | Est | Docs |
| --- | --- | --- | --- | --- | --- | --- |
| BE-S3-01 | Daftar + detail pinjaman Admin | `GET /admin/loans` (5 status selain `PENDING`, paginasi 10), `GET /admin/loans/:id` detail peminjam, buku, `late_days`, `fine_amount`, `fine_status`, serta flag tombol aksi. | AC-06.01, AC-06.02 | Semi | 1.0d | [04-loans](../api-specs/04-loans.md#get-adminloans-daftar-pinjaman-admin) |
| BE-S3-02 | Job status terlambat | Job harian 00:05 WIB: ubah `BORROWED` ke `OVERDUE`, hitung `late_days` & `fine_amount` awal, advisory lock PostgreSQL, Clock port injectable, catch-up saat startup, endpoint non-prod `POST /admin/jobs/run`. | AC-06.03 | Semi | 1.5d | [15-scheduler-and-notifications](../technical-specs/15-scheduler-and-notifications.md), [12-loan-lifecycle-and-fines](../technical-specs/12-loan-lifecycle-and-fines.md) |
| BE-S3-03 | Ajukan pengembalian + rating | `POST /loans/:id/return`: rating 1–5 wajib, transisi `BORROWED` -> `RETURN_PENDING` atau `OVERDUE` -> `FINE_PENDING`, bekukan `late_days` pada `return_requested_at`. | AC-09.01, AC-09.02, AC-09.06 | Semi | 1.0d | [04-loans](../api-specs/04-loans.md#post-loansidreturn-ajukan-pengembalian--rating-member), [12-loan-lifecycle-and-fines](../technical-specs/12-loan-lifecycle-and-fines.md) |
| BE-S3-04 | Denda + konfirmasi pengembalian | `POST /admin/loans/:id/fine-payment` (1–4 hari otomatis Rp 2.000, >=5 hari input manual `1..99999999`) dan `POST /admin/loans/:id/return-confirmation`: stok +1 atomik, guard denda `Sudah Bayar`. | AC-09.03, AC-09.04, AC-09.05, AC-09.08, AC-09.09 | Semi | 1.5d | [04-loans](../api-specs/04-loans.md#post-adminloansidfine-payment-pembayaran-denda), [13-stock-integrity-and-concurrency](../technical-specs/13-stock-integrity-and-concurrency.md) |
| BE-S3-05 | Notifikasi job + daftar + payload popup login | Job notifikasi (`DUE_SOON_3D`, `DUE_TODAY`, `OVERDUE` dgn unique constraint) dan `GET /notifications` yang mengembalikan daftar notifikasi persisten beserta `login_popups` terurut (`OVERDUE` -> `DUE_TODAY` -> `DUE_SOON`). | AC-10.01, AC-10.02, AC-10.03, AC-10.04, AC-10.05, AC-10.06, AC-10.07, AC-10.08 | Semi | 1.5d | [05-notifications](../api-specs/05-notifications.md), [15-scheduler-and-notifications](../technical-specs/15-scheduler-and-notifications.md) |

### Frontend

| Card ID | PM Card Title | Task Description | AC | Owner | Est | Docs |
| --- | --- | --- | --- | --- | --- | --- |
| FE-S3-01 | Manajemen Peminjaman UI | Daftar pinjaman Admin (5 status), halaman detail peminjaman & rincian keterlambatan/denda. | AC-06.01, AC-06.02 | Raden Mahesa | 1.0d | [04-loans](../api-specs/04-loans.md) |
| FE-S3-02 | Feedback Buku + batal | Tombol `"Kembalikan"`, pop up `"Feedback Buku"`, rating 1–5 bintang wajib, tombol `"Batal"` / `X`. | AC-09.01, AC-09.02, AC-09.06, AC-09.07 | Raden Mahesa | 1.5d | [04-loans](../api-specs/04-loans.md#post-loansidreturn-ajukan-pengembalian--rating-member) |
| FE-S3-03 | Admin konfirmasi + denda UI | Tombol `"Konfirmasi Pengembalian"`, alert rekonfirmasi, tombol `"Pembayaran Denda"` (alert untuk 1–4 hari, pop up `"Biaya Denda"` untuk >=5 hari), validasi & batal input. | AC-09.03, AC-09.04, AC-09.05, AC-09.08, AC-09.09, AC-09.10 | Raden Mahesa | 1.5d | [04-loans](../api-specs/04-loans.md), [12-loan-lifecycle-and-fines](../technical-specs/12-loan-lifecycle-and-fines.md) |
| FE-S3-04 | Notifikasi list + Popup Reminder Login | Ikon Notifikasi + daftar persisten (AC-10.01–10.03), serta komponen Popup Reminder saat login di Home (tampil 3 detik per kondisi sekali per login, urutan `OVERDUE` -> `DUE_TODAY` -> `DUE_SOON`, tombol tutup `X` lanjut ke popup berikutnya tanpa menghapus notifikasi, AC-10.04–10.08). | AC-10.01, AC-10.02, AC-10.03, AC-10.04, AC-10.05, AC-10.06, AC-10.07, AC-10.08 | Darrel | 1.5d | [05-notifications](../api-specs/05-notifications.md), [acceptance-criteria-addendum](../business/acceptance-criteria-addendum.md#us-10-reminder-batas-akhir-pinjaman) |
| FE-S3-05 | Wiring: return + fine + reminder + popup | Depends on FE-S3-02..04, BE-S3-04..05. Kriteria exit: Playwright E2E menguji pengembalian tepat waktu, terlambat 1–4 hari (Rp 2.000), >=5 hari input manual & batal, rating wajib & batal, job harian mengubah status ke Terlambat (AC-06.03), daftar notifikasi, serta urutan & penutupan popup login (AC-10.04–10.08). | AC-06.03, AC-09.01, AC-09.03, AC-09.04, AC-09.06, AC-09.08, AC-09.09, AC-09.10, AC-10.01, AC-10.02, AC-10.03, AC-10.04, AC-10.05, AC-10.06, AC-10.07, AC-10.08 | Darrel + Raden Mahesa | 1.0d | [04-loans](../api-specs/04-loans.md), [15-scheduler-and-notifications](../technical-specs/15-scheduler-and-notifications.md) |
