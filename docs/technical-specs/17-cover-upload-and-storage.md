**Version:** 0.1
**Date:** 2026-11-05
**Author:** Tech Lead
**Status:** Draft
**Phase:** Technical Specification

# Cover Upload and Storage - ReadOnly

Alur upload, validasi, dan penyimpanan cover (Q-13).

## Alur upload multipart

1. Client: `POST /admin/books` dengan `multipart/form-data`, field `cover` (file).
2. API: baca header Content-Type, ukur size, validasi sebelum menulis disk (validasi awal).
3. Storage port: `uploadCover()` → nama file acak → tulis ke volume `cover`.
4. Transaction: simpan `cover_path` bersama data buku; bila transaction rollback → `detachCover()` hapus berkas yatim.
5. Presentasi: `GET /covers/:relativePath` (API dev) atau proxy Nginx (prod).

## Validasi (Q-13)

| Pemeriksaan | Aturan | Pesan error |
| --- | --- | --- |
| Ekstensi | png, jpg, jpeg | "Format file cover buku tidak sesuai" |
| MIME type | image/png, image/jpeg, image/jpg | "Format file cover buku tidak sesuai" |
| Magic bytes | PNG/JPEG signature | "Format file cover buku tidak sesuai" |
| Ukuran | ≤ 5 MiB (5.242.880 byte; Q-13: "5Mb" belum dikonfirmasi) | "Ukuran file cover buku tidak boleh lebih dari 5Mb" |

- **Mandatory saat Add** (AC-05.01); **opsional saat Edit** (AC-05.05).
- Tanpa transcoding (P-06, Q-13).
- Nama file acak (UUID + ekstensi) → tidak diekspos urutan buku.
- Berkas yatim dibersihkan bila transaksi gagal (storage detach).

## Storage port dan adapter

- Adapter disk lokal: `storage/covers` di volume Docker (Q-13).
- Adapter uji: `MemoryStorageAdapter` (tes unit/integrasi).
- Cover yang diganti: file lama tetap ada (riwayat) kecuali transaction gagal → detach.

## Perilaku saat soft-delete buku (Q-11)

- Cover **tidak dihapus** saat buku di-soft-delete (riwayat peminjaman masih menunjuk buku). Cover yatim (buku terhapus keras, bila pernah ada) dipindahkan ke `storage/covers/orphan/` dan dibersihkan manual berkala.

## Volume dan backup

- Volume `cover` di-backup bersama database (`books.cover_path` menunjuk berkas di volume tersebut). Backup harian; target retention `[COPY-TBD Q-32]`.

## Cross-References

- [07-security.md](07-security.md) (SEC-05)
- [10-integration-points.md](10-integration-points.md)
- [api-specs/03-books.md](../api-specs/03-books.md)
- [docs/deployment-plan/02-infrastructure.md](../deployment-plan/02-infrastructure.md) (volume)

## Open Follow-ups

Q-13 (definisi "5Mb": 5.000.000 vs 5.242.880 byte), Q-32 (target ukuran thumbnail, tidak ada di v1).
