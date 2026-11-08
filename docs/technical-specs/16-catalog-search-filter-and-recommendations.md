**Version:** 0.1
**Date:** 2026-11-05
**Author:** Tech Lead
**Status:** Draft
**Phase:** Technical Specification

# Catalog, Search, Filter, and Recommendations - ReadOnly

## Pencarian kata kunci (Q-12)

- Pencarian pada Judul, Penulis, Genre.
- Pilihan: `ILIKE '%keyword%'` (simple) vs `pg_trgm` (similarity + ranking).
- **Keputusan:** `ILIKE` pada judul dan penulis; `ILIKE` pada genre name. `pg_trgm` di-backlog bila performa pada 10.000 buku di bawah target Q-32. Indexing: GIN/GiST tidak dipakai v1 (ILIKE sederhana sudah cukup untuk 10.000 baris; monitoring di-schedule).
- Bahasa: `ILIKE` peka kasus; `LOWER()` pada kolom dan keyword.

## Filter Penulis dan Genre (AC-05.07, AC-07.02)

- Dropdown Penulis: nilai unik `books.author` (ORDER BY). Dropdown Genre hanya menampilkan genre berstatus `Aktif` (AC-11.02, AC-11.06, AC-11.07). Genre `Nonaktif` tetap terlihat sebagai nilai terpilih saat mengedit buku lama, dengan penanda `Nonaktif` (AC-05.10).
- Semantik gabungan: `AND` antara filter penulis dan filter genre; pencarian menggabungkan `OR` antar field.
- Hasil: paginasi server-side 10/halaman (Q-12), urut terbaru dulu.

## Label "Tersedia" / "Tidak Tersedia" (AC-07.02)

- Label ditampilkan di halaman Home dan Master Buku:
  - `Tersedia` bila `available_count > 0`.
  - `Tidak Tersedia` bila `available_count = 0`.
- Label "3 tersedia" di kolom Ketersediaan Master Buku = `available_count` (AC-05.07).

## Paginasi dan urutan (Q-12)

- Server-side pagination: `?page=1&limit=10`.
- Urut default: `created_at DESC` (terbaru dulu).
- Total halaman dikirim di response envelope.

## Algoritma "Rekomendasi" (Q-27, Q-28)

- Definition: section "Rekomendasi" berisi buku bergenre sesuai preferensi Member **ATAU** berating rata-rata > 3, tanpa duplikat, urut **rata-rata rating menurun** lalu **terbaru**.
- Judul section: `[COPY-TBD Q-28]`.
- Ambang tegas: rata-rata rating > 3 (bukan "jumlah rating mayoritas > 3").
- Pseudocode SQL:

```sql
SELECT DISTINCT b.*
FROM books b
JOIN book_genres bg ON bg.book_id = b.id
JOIN user_genres ug ON ug.genre_id = bg.genre_id AND ug.user_id = :memberId
WHERE b.deleted_at IS NULL
  AND (bg.genre_id IN (:memberGenres) OR b.id IN (
    SELECT r.book_id FROM (
      SELECT book_id, AVG(score) AS avg_score FROM ratings GROUP BY book_id HAVING AVG(score) > 3
    ) r WHERE r.book_id = b.id
  ))
ORDER BY (SELECT AVG(score) FROM ratings WHERE loan_id IN (SELECT id FROM loans WHERE book_id = b.id)) DESC NULLS LAST,
         b.created_at DESC
LIMIT 6;
```

- Kasus tanpa kecocokan: section tampil kosong (tidak error).
- Pemutus seri: `created_at DESC`.

## Target performa

- Endpoint katalog: p95 < 300 ms pada 10.000 buku (Q-32). Index recommended: `(deleted_at IS NULL, created_at DESC)` - partial index bila perlu.

## What This Does NOT Do

- Tanpa collaborative filtering.
- Tanpa personalisasi berbasis riwayat peminjaman.
- Rekomendasi tidak mencakup buku `deleted_at IS NOT NULL`.

## Cross-References

- [06-data-model.md](06-data-model.md)
- [12-loan-lifecycle-and-fines.md](12-loan-lifecycle-and-fines.md)
- [api-specs/03-books.md](../api-specs/03-books.md)
- [api-specs/_index.md](../api-specs/_index.md)

## Open Follow-ups

Q-28 (judul section), Q-32 (target performa resmi). Status dan pengelolaan genre mengikuti US-11.
