**Version:** 0.2
**Date:** 2026-11-09
**Author:** Tech Lead
**Status:** Baseline kontrak API diselaraskan
**Phase:** API Specification

# Books API - ReadOnly

Base: `/api/v1`

## GET /books (katalog Home, Member)

- **Purpose:** daftar buku Home dengan filter + pencarian + rekomendasi (AC-07.01, AC-07.02, AC-07.03).
- **Access:** login (member).
- **Query:**
  - `q` opsional: pencarian substring tanpa membedakan kapitalisasi (`ILIKE`) pada judul, penulis, atau nama genre.
  - `author` opsional: filter eksak nama penulis (`books.author`).
  - `genre` opsional: filter berdasarkan `genre_id` (UUID genre berstatus `active`).
  - `recommends` opsional (`true` | `false`): bila `true`, menyertakan array `recommendations` (maksimal 6 buku bergenre sesuai preferensi Member atau rata-rata rating > 3, urut rata-rata rating menurun lalu `created_at DESC`).
  - `page` default `1`, `limit` default `10` dan maksimum `50`.
- **Output:** HTTP 200:

```json
{
  "data": [
    {
      "id": "uuid",
      "title": "string",
      "author": "string",
      "publisher": "string",
      "publication_year": 2024,
      "cover_url": "/api/v1/covers/uuid.jpg",
      "genres": [{ "id": "uuid", "name": "string", "status": "active" }],
      "available_count": 3,
      "is_available": true,
      "availability_label": "Tersedia",
      "average_rating": 4.5
    }
  ],
  "recommendations": [],
  "authors": ["string"],
  "pagination": { "page": 1, "limit": 10, "total": 12, "totalPages": 2 }
}
```

- **Catatan field:** `availability_label` bernilai `"Tersedia"` bila `available_count > 0` dan `"Tidak Tersedia"` bila `available_count === 0` (AC-07.02). `authors` mengembalikan daftar penulis unik dari buku aktif untuk mengisi dropdown Filter Penulis.
- **Errors:** `session_not_found` 401, `invalid_request` 422 untuk query tidak valid.
- **Traceability:** AC-07.01, AC-07.02, AC-07.03.

## GET /books/:id

- **Purpose:** detail buku (AC-07.04, AC-08.04).
- **Access:** login (member, admin).
- **Output:** HTTP 200:

```json
{
  "data": {
    "id": "uuid",
    "title": "string",
    "author": "string",
    "publisher": "string",
    "publication_year": 2024,
    "synopsis": "string",
    "cover_url": "/api/v1/covers/uuid.jpg",
    "genres": [{ "id": "uuid", "name": "string", "status": "active" }],
    "available_count": 3,
    "is_available": true,
    "availability_label": "Tersedia",
    "average_rating": 4.5
  }
}
```

- **Errors:** `session_not_found` 401, `not_found` 404.
- **Traceability:** AC-07.04, AC-08.04.

## GET /admin/books (Master Buku, Admin Perpus)

- **Purpose:** daftar Master Buku dengan filter + pencarian + paginasi (AC-05.07, AC-05.08, AC-05.10).
- **Access:** admin.
- **Query:** `q` opsional, `author` opsional, `genre` opsional (`genre_id`), `page` default `1`, `limit` default `10` dan maksimum `50`.
- **Output:** HTTP 200 paginasi dengan item buku yang sama seperti `GET /books/:id` (termasuk `genres: [{ id, name, status }]` agar form Edit dapat menampilkan penanda `Nonaktif` sesuai AC-05.10, serta `available_count` untuk kolom Ketersediaan `"3 tersedia"` sesuai AC-05.07) ditambah `authors: string[]` untuk opsi dropdown filter penulis.
- **Errors:** `session_not_found` 401, `forbidden` 403, `invalid_request` 422.
- **Traceability:** AC-05.07, AC-05.08, AC-05.10.

## POST /admin/books (tambah, cover via Storage port)

- **Purpose:** tambah buku baru (AC-05.01, AC-05.02, AC-05.03, AC-05.04).
- **Access:** admin.
- **Input (`multipart/form-data`):**
  - `cover`: File gambar wajib (`.png`, `.jpg`, `.jpeg`, maks 5 MiB).
  - `title`: string wajib.
  - `author`: string wajib.
  - `publisher`: string wajib.
  - `publication_year`: integer wajib (dikirim sebagai string angka di multipart).
  - `synopsis`: string wajib.
  - `genre_ids`: array UUID genre aktif wajib (minimal 1; dikirim sebagai repeated field `genre_ids` atau JSON array string).
  - `available_count`: integer `>= 0` wajib.
- **Behavior:** validasi semua field wajib, validasi ekstensi/MIME/magic bytes dan ukuran cover (Q-13), pastikan seluruh `genre_ids` berstatus `active`, simpan cover via Storage port dan baris `books` + `book_genres` dalam transaksi.
- **Output:** HTTP 201 `{ "data": { "id": "uuid" }, "message": "Buku berhasil ditambahkan" }`.
- **Errors:** `session_not_found` 401, `forbidden` 403, `invalid_request` 422 (`Field harus diisi!`, `Format file cover buku tidak sesuai`, `Ukuran file cover buku tidak boleh lebih dari 5Mb`).
- **Traceability:** AC-05.01, AC-05.02, AC-05.03, AC-05.04.

## PATCH /admin/books/:id (ubah)

- **Purpose:** ubah data buku; cover opsional (AC-05.05, AC-05.10).
- **Access:** admin.
- **Input (`multipart/form-data`):**
  - `cover`: File gambar opsional (jika dikirim, divalidasi dengan aturan yang sama seperti tambah buku).
  - `title`, `author`, `publisher`, `publication_year`, `synopsis`, `available_count`, `genre_ids`: wajib terisi (tidak boleh dikosongkan).
- **Behavior:** validasi cover bila di-upload; detach cover lama bila diganti setelah transaksi komit. Untuk `genre_ids`: genre berstatus `inactive` **diizinkan tetap tersimpan** hanya jika genre tersebut memang sudah terpasang pada buku ini sebelumnya; pilihan genre baru yang ditambahkan harus berstatus `active` (AC-05.10).
- **Output:** HTTP 200 `{ "data": { "id": "uuid" }, "message": "Buku berhasil diubah" }`.
- **Errors:** `session_not_found` 401, `forbidden` 403, `not_found` 404, `invalid_request` 422 (`Field harus diisi!`, `Format file cover buku tidak sesuai`, `Ukuran file cover buku tidak boleh lebih dari 5Mb`).
- **Traceability:** AC-05.02, AC-05.03, AC-05.04, AC-05.05, AC-05.10.

## DELETE /admin/books/:id (hapus, soft delete)

- **Purpose:** hapus buku secara soft delete (AC-05.06, AC-05.09).
- **Access:** admin.
- **Behavior:** tolak penghapusan dalam satu transaksi bila terdapat peminjaman untuk buku ini dengan `status <> 'RETURNED'` (termasuk `PENDING`, Q-11) dengan HTTP 403 `"Buku tidak dapat dihapus karena masih dipinjam"` (AC-05.09); bila lolos, set `deleted_at = now()`.
- **Output:** HTTP 200 `{ "data": { "id": "uuid" }, "message": "Buku berhasil dihapus" }`.
- **Errors:** `session_not_found` 401, `forbidden` 403 (`Buku tidak dapat dihapus karena masih dipinjam`), `not_found` 404.
- **Traceability:** AC-05.06, AC-05.09.

## API Contract: Master Genre (US-11)

> **Keputusan TL:** path dan skema berikut adalah kontrak v1 yang disetujui untuk implementasi; BE mengikuti kontrak dan FE mengonsumsinya. Seluruh operasi tetap di modul `books`; `genres` bukan modul API terpisah. Implementasi tetap `TODO` sampai kartu terkait dikerjakan.

### GET /admin/genres

- **Access:** admin.
- **Query:** `q` opsional (substring nama tanpa membedakan kapitalisasi), `page` default `1`, `limit` default `10` dan maksimum `50`.
- **Output:** HTTP 200 paginasi berisi `{ id, name, status, book_count }`; `status` bernilai `active`/`inactive`. `book_count` menghitung buku yang belum di-soft-delete dan memiliki relasi genre tersebut.
- **Hasil kosong:** HTTP 200 dengan `data: []`; FE menampilkan `Genre tidak ditemukan` untuk pencarian tanpa hasil (AC-11.10).
- **Errors:** `session_not_found` 401, `forbidden` 403, `invalid_request` 422 untuk query tidak valid.
- **Traceability:** AC-11.01, AC-11.10.

### POST /admin/genres

- **Access:** admin.
- **Request JSON:** `{ name: string }`; nama wajib dan tidak boleh kosong.
- **Behavior:** spasi awal/akhir di-trim sebelum disimpan. Pemeriksaan duplikat tidak membedakan kapitalisasi dan mengabaikan spasi awal/akhir; genre baru berstatus `active`.
- **Output:** HTTP 201 `{ data: { id, name, status: 'active' }, message: 'Genre berhasil ditambahkan' }`.
- **Errors:** `session_not_found` 401, `forbidden` 403, `invalid_request` 422 dengan copy AC `Field harus diisi!` dan `data.field: 'name'`, `conflict` 409 dengan copy AC `Genre sudah ada`.
- **Traceability:** AC-11.02–AC-11.04.

### PATCH /admin/genres/:id

- **Access:** admin.
- **Request JSON:** sekurang-kurangnya satu dari `{ name?: string, status?: 'active' | 'inactive' }`. Jika `name` dikirim, nilainya wajib tidak kosong; `status` hanya menerima dua nilai tersebut.
- **Behavior:** nama unik setelah trim dan normalisasi tanpa membedakan kapitalisasi. Mengubah nama mempertahankan relasi genre pada buku dan preferensi Member. Menonaktifkan genre tidak mengubah relasi yang sudah ada; pemilih genre untuk data baru hanya menyertakan genre aktif.
- **Output:** HTTP 200 `{ data: { id, name, status }, message }`. Pesan mengikuti aksi: `Genre berhasil diubah`, `Genre berhasil dinonaktifkan`, atau `Genre berhasil diaktifkan`.
- **Errors:** `session_not_found` 401, `forbidden` 403, `not_found` 404, `invalid_request` 422 (termasuk nama kosong), `conflict` 409 dengan copy AC `Genre sudah ada`.
- **Traceability:** AC-11.03–AC-11.07.

### DELETE /admin/genres/:id

- **Access:** admin.
- **Behavior:** hapus permanen hanya bila genre tidak direferensikan buku mana pun (termasuk buku aktif) atau preferensi Member mana pun (`book_genres` dan `user_genres`). Pengecekan relasi dan penghapusan dilakukan atomik.
- **Output:** HTTP 200 `{ data: { id }, message: 'Genre berhasil dihapus' }`.
- **Errors:** `session_not_found` 401, `forbidden` 403, `not_found` 404, `genre_in_use` 409 dengan copy AC `Genre tidak dapat dihapus karena masih digunakan. Nonaktifkan genre jika tidak ingin dipakai lagi.`
- **Traceability:** AC-11.08, AC-11.09.

## Cross-References

- [01-conventions.md](01-conventions.md)
- [06-data-model.md](../technical-specs/06-data-model.md)
- [13-stock-integrity-and-concurrency.md](../technical-specs/13-stock-integrity-and-concurrency.md)
- [16-catalog-search-filter-and-recommendations.md](../technical-specs/16-catalog-search-filter-and-recommendations.md)
- [17-cover-upload-and-storage.md](../technical-specs/17-cover-upload-and-storage.md)
- [docs/business/acceptance-criteria.md](../business/acceptance-criteria.md)
