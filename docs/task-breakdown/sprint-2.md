# Sprint 2: Katalog Member, Peminjaman dengan QR, dan Dashboard Admin

> **Historis:** task cards ini dibuat untuk rencana 3-sprint/50 AC. Bukan backlog aktif untuk rundown PM satu sprint. Task dan PIC baru dibentuk pada Technical Discussion; scope dipilih saat Sprint Planning.

Stories: US-07, US-08, US-04  
Goal: Member dapat menjelajah dan mengajukan peminjaman; Admin dapat mengonfirmasi peminjaman lewat kamera browser; Dashboard menampilkan enam metrik.

### Backend

| Card ID | PM Card Title | Task Description | AC | Owner | Est | Docs |
| --- | --- | --- | --- | --- | --- | --- |
| BE-S2-01 | Catalog Home + detail | GET /books (filter, search, paginasi 10, rekomendasi genre), GET /books/:id. | AC-07.01, AC-07.02, AC-07.03, AC-07.04, AC-08.04 | BE1 | 1.5d | [03-books](../api-specs/03-books.md#get-books-katalog-home-member), [16-catalog-search-filter-and-recommendations](../technical-specs/16-catalog-search-filter-and-recommendations.md) |
| BE-S2-02 | Ajukan pinjam + token QR | POST /loans, GET /loans/me, GET /loans/:id/qr (token 128 bit hash sekali pakai). | AC-08.01, AC-08.02, AC-08.05 | BE1 | 1.5d | [04-loans](../api-specs/04-loans.md#post-loans-ajukan-peminjaman-member), [14-qr-borrow-confirmation](../technical-specs/14-qr-borrow-confirmation.md) |
| BE-S2-03 | QR confirm + stock decrement | POST /admin/loans/qr/preview dan confirm: conditional decrement stok, single-use, 409 saat habis. | AC-08.03, AC-08.06 | BE1 | 1.0d | [04-loans](../api-specs/04-loans.md#post-adminloansqrconfirm-konfirmasi-sekali-pakai), [13-stock-integrity-and-concurrency](../technical-specs/13-stock-integrity-and-concurrency.md) |
| BE-S2-04 | Dashboard summary | GET /admin/dashboard/summary enam metrik + pie chart (Q-26). | AC-04.01 | BE1 | 1.0d | [06-dashboard](../api-specs/06-dashboard.md#get-admindashboardsummary) |

### Frontend

| Card ID | PM Card Title | Task Description | AC | Owner | Est | Docs |
| --- | --- | --- | --- | --- | --- | --- |
| FE-S2-01 | Home + detail buku | Halaman Home (rekomendasi, kartu buku, label Tersedia/Tidak Tersedia, Filter, cari, ikon Notif), Detail Buku ("Pinjam"). | AC-07.01, AC-07.02, AC-07.03, AC-07.04, AC-08.04 | FE1 | 3.0d | [03-books](../api-specs/03-books.md) |
| FE-S2-02 | Pinjaman + QR member | Halaman Pinjaman (daftar, aksi sesuai status), pop up "QR Code Peminjaman". | AC-08.01, AC-08.02, AC-08.05 | FE1 | 1.5d | [04-loans](../api-specs/04-loans.md), [14-qr-borrow-confirmation](../technical-specs/14-qr-borrow-confirmation.md) |
| FE-S2-03 | Dashboard Admin + scan QR | Enam metrik, pie chart, tombol "Scan QR", pop up scanner kamera, pop up "Konfirmasi Peminjaman". | AC-04.01, AC-08.03, AC-08.06 | FE1 | 2.0d | [06-dashboard](../api-specs/06-dashboard.md), [04-loans](../api-specs/04-loans.md) |
| FE-S2-04 | Wiring: borrow flow e2e | Depends on FE-S2-02, FE-S2-03, BE-S2-03; FE selesai terakhir sehingga FE memiliki kartu wiring. Kriteria exit: Playwright E2E menguji alur dua konteks browser Member lalu Admin sampai "Sedang Dipinjam" dan stok berkurang 1; QR tidak valid (AC-08.06); stok habis (AC-08.04); dua Member merebut stok terakhir (Q-15). | AC-08.03, AC-08.04, AC-08.06 | FE1 | 1.5d | [04-loans](../api-specs/04-loans.md), [14-qr-borrow-confirmation](../technical-specs/14-qr-borrow-confirmation.md) |
