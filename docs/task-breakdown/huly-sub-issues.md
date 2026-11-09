# Huly Sub-Issue Drafts - ReadOnly

> Draft untuk membantu PM memasukkan kartu FE/BE ke Huly. Issue belum dibuat di Huly.

## Petunjuk PM

- Memuat 14 kartu BE dan 16 kartu FE. Kartu `TL-S1-01` dan `DB-S1-01` tidak disertakan karena sudah selesai dan dimiliki TL.
- Isi referensi Huly project/workspace dan parent issue sebelum membuat sub-issue. Repository tidak mencantumkan referensi workspace atau parent issue US.
- Tentukan satu parent Huly untuk tiap sub-issue. Untuk kartu lintas-US, pertahankan satu kartu/PR, pilih parent di Huly, dan simpan semua US terkait pada kolom Related US.
- Kolom Assignee Huly dikosongkan karena akun/identitas assignee belum dikonfirmasi. PIC(s) mencatat nama PIC dari task breakdown.
- Sprint dan Story Points dikosongkan karena scope dan estimasi PM ditetapkan saat Sprint Planning. Engineering Estimate tetap menggunakan dev-day dan bukan story point.
- Workbook ini adalah draft untuk PM. Lengkapi referensi project/workspace, parent, dan assignee sesuai alur Huly yang digunakan.
- `FE-S1-01` tidak terikat pada US tertentu; Darrel dicatat sebagai asumsi untuk pekerjaan shell lintas fitur.
- Kolom BE pada screenshot tampak digabung untuk seluruh daftar US, sehingga Semi dicatat sebagai PIC BE seluruh US.

## Backend

### [BE-S1-01] Register two-step + active genres

- **Issue type:** Sub-issue (draft)
- **PIC(s):** Semi
- **Related US:** US-01
- **AC:** `AC-01.02, AC-01.03, AC-01.04, AC-01.05, AC-01.06, AC-01.07, AC-01.08`
- **Engineering estimate:** 1.0d
- **Parent Huly issue:** _Diisi PM_
- **Huly assignee:** _Diisi PM dengan akun Huly_
- **Description:** `POST /auth/register/validate`, `POST /auth/register`, dan `GET /genres` (hanya genre `active`): mandatory, email format, confirm match, uniqueness 409, genre wajib, bcrypt, rate limit.
- **Reference docs:** [02-authentication](../api-specs/02-authentication.md#post-authregistervalidate-q-05), [09-authentication-and-authorization](../technical-specs/09-authentication-and-authorization.md)

### [BE-S1-02] Login, session, logout, inactive check

- **Issue type:** Sub-issue (draft)
- **PIC(s):** Semi
- **Related US:** US-02, US-03, US-12
- **AC:** `AC-02.01, AC-02.02, AC-02.03, AC-02.04, AC-02.05, AC-03.01, AC-12.07`
- **Engineering estimate:** 1.0d
- **Parent Huly issue:** _Diisi PM_
- **Huly assignee:** _Diisi PM dengan akun Huly_
- **Description:** `POST /auth/login` (termasuk tolak akun `inactive` 403 sesuai AC-12.07), `GET /auth/me`, `POST /auth/logout`, cookie HttpOnly, rate limit, RBAC middleware (`requireAuth`, `requireRole`).
- **Reference docs:** [02-authentication](../api-specs/02-authentication.md#post-authlogin), [07-security](../technical-specs/07-security.md)

### [BE-S1-03] Master Buku CRUD + cover + inactive genre

- **Issue type:** Sub-issue (draft)
- **PIC(s):** Semi
- **Related US:** US-05
- **AC:** `AC-05.01, AC-05.02, AC-05.03, AC-05.04, AC-05.05, AC-05.06, AC-05.07, AC-05.08, AC-05.09, AC-05.10`
- **Engineering estimate:** 2.5d
- **Parent Huly issue:** _Diisi PM_
- **Huly assignee:** _Diisi PM dengan akun Huly_
- **Description:** `GET/POST/PATCH/DELETE /admin/books`, upload cover Storage port, search/filter, soft-delete guard (Q-11), dan dukungan simpan buku lama dengan genre nonaktif tanpa perubahan (AC-05.10).
- **Reference docs:** [03-books](../api-specs/03-books.md), [17-cover-upload-and-storage](../technical-specs/17-cover-upload-and-storage.md), [13-stock-integrity-and-concurrency](../technical-specs/13-stock-integrity-and-concurrency.md)

### [BE-S1-04] Master Genre CRUD & status (US-11)

- **Issue type:** Sub-issue (draft)
- **PIC(s):** Semi
- **Related US:** US-11
- **AC:** `AC-11.01, AC-11.02, AC-11.03, AC-11.04, AC-11.05, AC-11.06, AC-11.07, AC-11.08, AC-11.09, AC-11.10`
- **Engineering estimate:** 1.25d
- **Parent Huly issue:** _Diisi PM_
- **Huly assignee:** _Diisi PM dengan akun Huly_
- **Description:** `GET /admin/genres`, `POST /admin/genres`, `PATCH /admin/genres/:id`, `DELETE /admin/genres/:id` di modul `books`: trim & case-insensitive unique check, toggle `active`/`inactive`, hard-delete guard `409 genre_in_use` bila dipakai buku atau preferensi Member.
- **Reference docs:** [03-books](../api-specs/03-books.md#api-contract-master-genre-us-11), [2026-11-08-api-contract](../decisions/2026-11-08-api-contract.md)

### [BE-S1-05] Management User Admin (US-12)

- **Issue type:** Sub-issue (draft)
- **PIC(s):** Semi
- **Related US:** US-12
- **AC:** `AC-12.01, AC-12.02, AC-12.03, AC-12.04, AC-12.05, AC-12.06, AC-12.07, AC-12.08, AC-12.09, AC-12.10, AC-12.11`
- **Engineering estimate:** 1.25d
- **Parent Huly issue:** _Diisi PM_
- **Huly assignee:** _Diisi PM dengan akun Huly_
- **Description:** `GET /admin/users`, `GET /admin/users/:id`, `POST /admin/users`, `PATCH /admin/users/:id`, `PATCH /admin/users/:id/status` di modul `auth`: tambah Admin, edit terbatas (email/role terkunci), aktif/nonaktif dengan guard akun sendiri (`cannot_deactivate_self`) & pinjaman aktif (`account_has_active_loans`).
- **Reference docs:** [02-authentication](../api-specs/02-authentication.md#api-contract-management-user-us-12), [2026-11-08-api-contract](../decisions/2026-11-08-api-contract.md)

### [BE-S2-01] Catalog Home + detail

- **Issue type:** Sub-issue (draft)
- **PIC(s):** Semi
- **Related US:** US-07, US-08
- **AC:** `AC-07.01, AC-07.02, AC-07.03, AC-07.04, AC-08.04`
- **Engineering estimate:** 1.5d
- **Parent Huly issue:** _Diisi PM_
- **Huly assignee:** _Diisi PM dengan akun Huly_
- **Description:** GET /books (filter, search, paginasi 10, rekomendasi genre), GET /books/:id.
- **Reference docs:** [03-books](../api-specs/03-books.md#get-books-katalog-home-member), [16-catalog-search-filter-and-recommendations](../technical-specs/16-catalog-search-filter-and-recommendations.md)

### [BE-S2-02] Ajukan pinjam + token QR

- **Issue type:** Sub-issue (draft)
- **PIC(s):** Semi
- **Related US:** US-08
- **AC:** `AC-08.01, AC-08.02, AC-08.05`
- **Engineering estimate:** 1.5d
- **Parent Huly issue:** _Diisi PM_
- **Huly assignee:** _Diisi PM dengan akun Huly_
- **Description:** POST /loans, GET /loans/me, GET /loans/:id/qr (token 128 bit hash sekali pakai).
- **Reference docs:** [04-loans](../api-specs/04-loans.md#post-loans-ajukan-peminjaman-member), [14-qr-borrow-confirmation](../technical-specs/14-qr-borrow-confirmation.md)

### [BE-S2-03] QR confirm + stock decrement

- **Issue type:** Sub-issue (draft)
- **PIC(s):** Semi
- **Related US:** US-08
- **AC:** `AC-08.03, AC-08.06`
- **Engineering estimate:** 1.0d
- **Parent Huly issue:** _Diisi PM_
- **Huly assignee:** _Diisi PM dengan akun Huly_
- **Description:** POST /admin/loans/qr/preview dan confirm: conditional decrement stok, single-use, 409 saat habis.
- **Reference docs:** [04-loans](../api-specs/04-loans.md#post-adminloansqrconfirm-konfirmasi-sekali-pakai), [13-stock-integrity-and-concurrency](../technical-specs/13-stock-integrity-and-concurrency.md)

### [BE-S2-04] Dashboard summary

- **Issue type:** Sub-issue (draft)
- **PIC(s):** Semi
- **Related US:** US-04
- **AC:** `AC-04.01`
- **Engineering estimate:** 1.0d
- **Parent Huly issue:** _Diisi PM_
- **Huly assignee:** _Diisi PM dengan akun Huly_
- **Description:** GET /admin/dashboard/summary enam metrik + pie chart (Q-26).
- **Reference docs:** [06-dashboard](../api-specs/06-dashboard.md#get-admindashboardsummary)

### [BE-S3-01] Daftar + detail pinjaman Admin

- **Issue type:** Sub-issue (draft)
- **PIC(s):** Semi
- **Related US:** US-06
- **AC:** `AC-06.01, AC-06.02`
- **Engineering estimate:** 1.0d
- **Parent Huly issue:** _Diisi PM_
- **Huly assignee:** _Diisi PM dengan akun Huly_
- **Description:** `GET /admin/loans` (5 status selain `PENDING`, paginasi 10), `GET /admin/loans/:id` detail peminjam, buku, `late_days`, `fine_amount`, `fine_status`, serta flag tombol aksi.
- **Reference docs:** [04-loans](../api-specs/04-loans.md#get-adminloans-daftar-pinjaman-admin)

### [BE-S3-02] Job status terlambat

- **Issue type:** Sub-issue (draft)
- **PIC(s):** Semi
- **Related US:** US-06
- **AC:** `AC-06.03`
- **Engineering estimate:** 1.5d
- **Parent Huly issue:** _Diisi PM_
- **Huly assignee:** _Diisi PM dengan akun Huly_
- **Description:** Job harian 00:05 WIB: ubah `BORROWED` ke `OVERDUE`, hitung `late_days` & `fine_amount` awal, advisory lock PostgreSQL, Clock port injectable, catch-up saat startup, endpoint non-prod `POST /admin/jobs/run`.
- **Reference docs:** [15-scheduler-and-notifications](../technical-specs/15-scheduler-and-notifications.md), [12-loan-lifecycle-and-fines](../technical-specs/12-loan-lifecycle-and-fines.md)

### [BE-S3-03] Ajukan pengembalian + rating

- **Issue type:** Sub-issue (draft)
- **PIC(s):** Semi
- **Related US:** US-09
- **AC:** `AC-09.01, AC-09.02, AC-09.06`
- **Engineering estimate:** 1.0d
- **Parent Huly issue:** _Diisi PM_
- **Huly assignee:** _Diisi PM dengan akun Huly_
- **Description:** `POST /loans/:id/return`: rating 1–5 wajib, transisi `BORROWED` -> `RETURN_PENDING` atau `OVERDUE` -> `FINE_PENDING`, bekukan `late_days` pada `return_requested_at`.
- **Reference docs:** [04-loans](../api-specs/04-loans.md#post-loansidreturn-ajukan-pengembalian--rating-member), [12-loan-lifecycle-and-fines](../technical-specs/12-loan-lifecycle-and-fines.md)

### [BE-S3-04] Denda + konfirmasi pengembalian

- **Issue type:** Sub-issue (draft)
- **PIC(s):** Semi
- **Related US:** US-09
- **AC:** `AC-09.03, AC-09.04, AC-09.05, AC-09.08, AC-09.09`
- **Engineering estimate:** 1.5d
- **Parent Huly issue:** _Diisi PM_
- **Huly assignee:** _Diisi PM dengan akun Huly_
- **Description:** `POST /admin/loans/:id/fine-payment` (1–4 hari otomatis Rp 2.000, >=5 hari input manual `1..99999999`) dan `POST /admin/loans/:id/return-confirmation`: stok +1 atomik, guard denda `Sudah Bayar`.
- **Reference docs:** [04-loans](../api-specs/04-loans.md#post-adminloansidfine-payment-pembayaran-denda), [13-stock-integrity-and-concurrency](../technical-specs/13-stock-integrity-and-concurrency.md)

### [BE-S3-05] Notifikasi job + daftar + payload popup login

- **Issue type:** Sub-issue (draft)
- **PIC(s):** Semi
- **Related US:** US-10
- **AC:** `AC-10.01, AC-10.02, AC-10.03, AC-10.04, AC-10.05, AC-10.06, AC-10.07, AC-10.08`
- **Engineering estimate:** 1.5d
- **Parent Huly issue:** _Diisi PM_
- **Huly assignee:** _Diisi PM dengan akun Huly_
- **Description:** Job notifikasi (`DUE_SOON_3D`, `DUE_TODAY`, `OVERDUE` dgn unique constraint) dan `GET /notifications` yang mengembalikan daftar notifikasi persisten beserta `login_popups` terurut (`OVERDUE` -> `DUE_TODAY` -> `DUE_SOON`).
- **Reference docs:** [05-notifications](../api-specs/05-notifications.md), [15-scheduler-and-notifications](../technical-specs/15-scheduler-and-notifications.md)

## Frontend

### [FE-S1-01] Shell, router guard, API client

- **Issue type:** Sub-issue (draft)
- **PIC(s):** Darrel
- **Related US:** Tidak spesifik
- **AC:** `-`
- **Engineering estimate:** 2.0d
- **Parent Huly issue:** _Diisi PM_
- **Huly assignee:** _Diisi PM dengan akun Huly_
- **Description:** Layout responsif, navigasi per peran (`member` vs `admin`), guard autentikasi, typed API client di `apps/web/src/api/`, pemetaan error envelope.
- **Reference docs:** [03-repository-structure](../technical-specs/03-repository-structure.md), [09-authentication-and-authorization](../technical-specs/09-authentication-and-authorization.md)

### [FE-S1-02] Register two-step UI

- **Issue type:** Sub-issue (draft)
- **PIC(s):** Darrel
- **Related US:** US-01
- **AC:** `AC-01.01, AC-01.02, AC-01.03, AC-01.04, AC-01.05, AC-01.06, AC-01.07, AC-01.08`
- **Engineering estimate:** 1.5d
- **Parent Huly issue:** _Diisi PM_
- **Huly assignee:** _Diisi PM dengan akun Huly_
- **Description:** Form langkah 1 (6 field, tombol `"Next"`), Pilih Genre multitag aktif (tombol `"Daftar"`), pesan inline verbatim (termasuk teks `mendafta` bila ditampilkan).
- **Reference docs:** [02-authentication](../api-specs/02-authentication.md)

### [FE-S1-03] Login, email header, logout

- **Issue type:** Sub-issue (draft)
- **PIC(s):** Darrel
- **Related US:** US-02, US-03, US-12
- **AC:** `AC-02.01, AC-02.02, AC-02.03, AC-02.04, AC-02.05, AC-03.01, AC-12.07`
- **Engineering estimate:** 1.25d
- **Parent Huly issue:** _Diisi PM_
- **Huly assignee:** _Diisi PM dengan akun Huly_
- **Description:** Form login, validasi verbatim (termasuk pesan akun nonaktif AC-12.07), email ditampilkan di pojok kanan atas sesuai AC-02.01, redirect per peran, tombol Logout.
- **Reference docs:** [02-authentication](../api-specs/02-authentication.md#post-authlogin)

### [FE-S1-04] Master Buku UI + genre nonaktif

- **Issue type:** Sub-issue (draft)
- **PIC(s):** Raden Mahesa
- **Related US:** US-05
- **AC:** `AC-05.01, AC-05.02, AC-05.03, AC-05.04, AC-05.05, AC-05.06, AC-05.07, AC-05.08, AC-05.09, AC-05.10`
- **Engineering estimate:** 2.5d
- **Parent Huly issue:** _Diisi PM_
- **Huly assignee:** _Diisi PM dengan akun Huly_
- **Description:** Tabel Master Buku, form Add/Edit upload cover, penanda `Nonaktif` pada genre lama saat Edit (AC-05.10), hapus dengan alert rekonfirmasi, Filter Penulis/Genre Aktif, pencarian.
- **Reference docs:** [03-books](../api-specs/03-books.md)

### [FE-S1-05] Master Genre UI (US-11)

- **Issue type:** Sub-issue (draft)
- **PIC(s):** Raden Mahesa
- **Related US:** US-11
- **AC:** `AC-11.01, AC-11.02, AC-11.03, AC-11.04, AC-11.05, AC-11.06, AC-11.07, AC-11.08, AC-11.09, AC-11.10`
- **Engineering estimate:** 1.25d
- **Parent Huly issue:** _Diisi PM_
- **Huly assignee:** _Diisi PM dengan akun Huly_
- **Description:** Halaman `Master Genre`: tabel (Nama Genre, Jumlah Buku, Status, Action), pencarian (`Genre tidak ditemukan`), form Add/Edit, alert konfirmasi Nonaktifkan & Hapus, pesan sukses/error verbatim.
- **Reference docs:** [03-books](../api-specs/03-books.md#api-contract-master-genre-us-11), [acceptance-criteria-addendum](../business/acceptance-criteria-addendum.md#us-11-master-genre-admin-perpus)

### [FE-S1-06] Management User UI (US-12)

- **Issue type:** Sub-issue (draft)
- **PIC(s):** Darrel
- **Related US:** US-12
- **AC:** `AC-12.01, AC-12.02, AC-12.03, AC-12.04, AC-12.05, AC-12.06, AC-12.07, AC-12.08, AC-12.09, AC-12.10, AC-12.11`
- **Engineering estimate:** 1.25d
- **Parent Huly issue:** _Diisi PM_
- **Huly assignee:** _Diisi PM dengan akun Huly_
- **Description:** Halaman `Management User`: tabel (Nama Lengkap, Email, Nomor Ponsel, Role, Status, Action), pencarian & filter Role (`User tidak ditemukan`), form `Add Admin`, form `Edit User` (Email & Role read-only), disable tombol `Nonaktifkan` pada diri sendiri (AC-12.09), alert konfirmasi & pesan guard pinjaman aktif.
- **Reference docs:** [02-authentication](../api-specs/02-authentication.md#api-contract-management-user-us-12), [acceptance-criteria-addendum](../business/acceptance-criteria-addendum.md#us-12-management-user-admin-perpus)

### [FE-S1-07] Wiring E2E: Auth, Master Buku, Genre, User

- **Issue type:** Sub-issue (draft)
- **PIC(s):** Darrel + Raden Mahesa
- **Related US:** US-01, US-02, US-03, US-05, US-11, US-12
- **AC:** `AC-01.06, AC-01.08, AC-02.02, AC-02.03, AC-02.04, AC-02.05, AC-03.01, AC-05.03, AC-05.04, AC-05.09, AC-05.10, AC-11.04, AC-11.09, AC-12.07, AC-12.09, AC-12.10`
- **Engineering estimate:** 1.5d
- **Parent Huly issue:** _Diisi PM_
- **Huly assignee:** _Diisi PM dengan akun Huly_
- **Description:** Depends on FE-S1-02..06 & BE-S1-01..05. Kriteria exit: Playwright E2E menguji register 2 langkah, login Member/Admin/Nonaktif, logout, CRUD Master Buku + genre nonaktif (AC-05.10), Master Genre CRUD/guard hapus (US-11), dan Management User tambah Admin/edit/guard nonaktif (US-12).
- **Reference docs:** [02-authentication](../api-specs/02-authentication.md), [03-books](../api-specs/03-books.md)

### [FE-S2-01] Home + detail buku

- **Issue type:** Sub-issue (draft)
- **PIC(s):** Darrel + Raden Mahesa
- **Related US:** US-07, US-08
- **AC:** `AC-07.01, AC-07.02, AC-07.03, AC-07.04, AC-08.04`
- **Engineering estimate:** 3.0d
- **Parent Huly issue:** _Diisi PM_
- **Huly assignee:** _Diisi PM dengan akun Huly_
- **Description:** Halaman Home (rekomendasi, kartu buku, label Tersedia/Tidak Tersedia, Filter, cari, ikon Notif), Detail Buku ("Pinjam").
- **Reference docs:** [03-books](../api-specs/03-books.md)

### [FE-S2-02] Pinjaman + QR member

- **Issue type:** Sub-issue (draft)
- **PIC(s):** Raden Mahesa
- **Related US:** US-08
- **AC:** `AC-08.01, AC-08.02, AC-08.05`
- **Engineering estimate:** 1.5d
- **Parent Huly issue:** _Diisi PM_
- **Huly assignee:** _Diisi PM dengan akun Huly_
- **Description:** Halaman Pinjaman (daftar, aksi sesuai status), pop up "QR Code Peminjaman".
- **Reference docs:** [04-loans](../api-specs/04-loans.md), [14-qr-borrow-confirmation](../technical-specs/14-qr-borrow-confirmation.md)

### [FE-S2-03] Dashboard Admin + scan QR

- **Issue type:** Sub-issue (draft)
- **PIC(s):** Raden Mahesa
- **Related US:** US-04, US-08
- **AC:** `AC-04.01, AC-08.03, AC-08.06`
- **Engineering estimate:** 2.0d
- **Parent Huly issue:** _Diisi PM_
- **Huly assignee:** _Diisi PM dengan akun Huly_
- **Description:** Enam metrik, pie chart, tombol "Scan QR", pop up scanner kamera, pop up "Konfirmasi Peminjaman".
- **Reference docs:** [06-dashboard](../api-specs/06-dashboard.md), [04-loans](../api-specs/04-loans.md)

### [FE-S2-04] Wiring: borrow flow e2e

- **Issue type:** Sub-issue (draft)
- **PIC(s):** Raden Mahesa
- **Related US:** US-08
- **AC:** `AC-08.03, AC-08.04, AC-08.06`
- **Engineering estimate:** 1.5d
- **Parent Huly issue:** _Diisi PM_
- **Huly assignee:** _Diisi PM dengan akun Huly_
- **Description:** Depends on FE-S2-02, FE-S2-03, BE-S2-03; FE selesai terakhir sehingga FE memiliki kartu wiring. Kriteria exit: Playwright E2E menguji alur dua konteks browser Member lalu Admin sampai "Sedang Dipinjam" dan stok berkurang 1; QR tidak valid (AC-08.06); stok habis (AC-08.04); dua Member merebut stok terakhir (Q-15).
- **Reference docs:** [04-loans](../api-specs/04-loans.md), [14-qr-borrow-confirmation](../technical-specs/14-qr-borrow-confirmation.md)

### [FE-S3-01] Manajemen Peminjaman UI

- **Issue type:** Sub-issue (draft)
- **PIC(s):** Raden Mahesa
- **Related US:** US-06
- **AC:** `AC-06.01, AC-06.02`
- **Engineering estimate:** 1.0d
- **Parent Huly issue:** _Diisi PM_
- **Huly assignee:** _Diisi PM dengan akun Huly_
- **Description:** Daftar pinjaman Admin (5 status), halaman detail peminjaman & rincian keterlambatan/denda.
- **Reference docs:** [04-loans](../api-specs/04-loans.md)

### [FE-S3-02] Feedback Buku + batal

- **Issue type:** Sub-issue (draft)
- **PIC(s):** Raden Mahesa
- **Related US:** US-09
- **AC:** `AC-09.01, AC-09.02, AC-09.06, AC-09.07`
- **Engineering estimate:** 1.5d
- **Parent Huly issue:** _Diisi PM_
- **Huly assignee:** _Diisi PM dengan akun Huly_
- **Description:** Tombol `"Kembalikan"`, pop up `"Feedback Buku"`, rating 1–5 bintang wajib, tombol `"Batal"` / `X`.
- **Reference docs:** [04-loans](../api-specs/04-loans.md#post-loansidreturn-ajukan-pengembalian--rating-member)

### [FE-S3-03] Admin konfirmasi + denda UI

- **Issue type:** Sub-issue (draft)
- **PIC(s):** Raden Mahesa
- **Related US:** US-09
- **AC:** `AC-09.03, AC-09.04, AC-09.05, AC-09.08, AC-09.09, AC-09.10`
- **Engineering estimate:** 1.5d
- **Parent Huly issue:** _Diisi PM_
- **Huly assignee:** _Diisi PM dengan akun Huly_
- **Description:** Tombol `"Konfirmasi Pengembalian"`, alert rekonfirmasi, tombol `"Pembayaran Denda"` (alert untuk 1–4 hari, pop up `"Biaya Denda"` untuk >=5 hari), validasi & batal input.
- **Reference docs:** [04-loans](../api-specs/04-loans.md), [12-loan-lifecycle-and-fines](../technical-specs/12-loan-lifecycle-and-fines.md)

### [FE-S3-04] Notifikasi list + Popup Reminder Login

- **Issue type:** Sub-issue (draft)
- **PIC(s):** Darrel
- **Related US:** US-10
- **AC:** `AC-10.01, AC-10.02, AC-10.03, AC-10.04, AC-10.05, AC-10.06, AC-10.07, AC-10.08`
- **Engineering estimate:** 1.5d
- **Parent Huly issue:** _Diisi PM_
- **Huly assignee:** _Diisi PM dengan akun Huly_
- **Description:** Ikon Notifikasi + daftar persisten (AC-10.01–10.03), serta komponen Popup Reminder saat login di Home (tampil 3 detik per kondisi sekali per login, urutan `OVERDUE` -> `DUE_TODAY` -> `DUE_SOON`, tombol tutup `X` lanjut ke popup berikutnya tanpa menghapus notifikasi, AC-10.04–10.08).
- **Reference docs:** [05-notifications](../api-specs/05-notifications.md), [acceptance-criteria-addendum](../business/acceptance-criteria-addendum.md#us-10-reminder-batas-akhir-pinjaman)

### [FE-S3-05] Wiring: return + fine + reminder + popup

- **Issue type:** Sub-issue (draft)
- **PIC(s):** Darrel + Raden Mahesa
- **Related US:** US-06, US-09, US-10
- **AC:** `AC-06.03, AC-09.01, AC-09.03, AC-09.04, AC-09.06, AC-09.08, AC-09.09, AC-09.10, AC-10.01, AC-10.02, AC-10.03, AC-10.04, AC-10.05, AC-10.06, AC-10.07, AC-10.08`
- **Engineering estimate:** 1.0d
- **Parent Huly issue:** _Diisi PM_
- **Huly assignee:** _Diisi PM dengan akun Huly_
- **Description:** Depends on FE-S3-02..04, BE-S3-04..05. Kriteria exit: Playwright E2E menguji pengembalian tepat waktu, terlambat 1–4 hari (Rp 2.000), >=5 hari input manual & batal, rating wajib & batal, job harian mengubah status ke Terlambat (AC-06.03), daftar notifikasi, serta urutan & penutupan popup login (AC-10.04–10.08).
- **Reference docs:** [04-loans](../api-specs/04-loans.md), [15-scheduler-and-notifications](../technical-specs/15-scheduler-and-notifications.md)
