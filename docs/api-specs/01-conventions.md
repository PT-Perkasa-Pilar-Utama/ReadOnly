**Version:** 0.2
**Date:** 2026-11-08
**Author:** Tech Lead
**Status:** Baseline konvensi API
**Phase:** API Specification

# API Conventions - ReadOnly

Base address, envelope, status codes, error codes, roles, dan message catalog.

## Base address dan content type

- Base: `/api/v1`
- `Content-Type: application/json` kecuali upload cover → `multipart/form-data`.

## Envelope sukses

```json
{ "data": { ... }, "message": "Buku berhasil ditambahkan" }
```

`message` wajib untuk mutasi yang copy suksesnya ditetapkan AC; pada operasi baca, `message` boleh tidak ada. HTTP status adalah status sukses yang tercantum pada operasi.

## Envelope error

```json
{
  "statusCode": 422,
  "error": "Unprocessable Entity",
  "code": "invalid_request",
  "message": "Field harus diisi!",
  "data": { "field": "name" }
}
```

`statusCode` harus sama dengan HTTP status; `error` memakai frasa status HTTP; `code` stabil untuk pemetaan FE; `message` memakai copy AC bila tersedia; `data` opsional dan hanya memuat detail aman, misalnya nama field yang gagal. Jangan mengirim stack trace, query, rahasia, atau PII yang tidak diperlukan.

## Paginasi (Q-12)

```json
{
  "data": [ { "id": "...", "title": "...", ... } ],
  "pagination": { "page": 1, "limit": 10, "total": 123, "totalPages": 13 }
}
```
Query: `?page=1&limit=10`. Default `page=1`, default `limit=10`, maksimum `limit=50`. `data` selalu array; hasil kosong menghasilkan HTTP 200 dengan `data: []` dan nilai paginasi yang sesuai.

## Tabel kode status

| Status | Arti |
| --- | --- |
| 200 | OK (sukses, ada data) |
| 201 | Created (resource baru) |
| 204 | No Content (hapus berhasil, tanpa body) |
| 400 | Bad Request (JSON malformed atau content type tidak didukung) |
| 401 | Unauthorized (tidak ada sesi) |
| 403 | Forbidden (akses objek/role) |
| 404 | Not Found (resource tidak ada) |
| 409 | Conflict (race: email/genre terdaftar, stok habis) |
| 422 | Unprocessable Entity (validasi field/query atau status bisnis gagal, token invalid) |
| 429 | Too Many Requests (rate limit) |
| 500 | Internal Server Error |

## Tabel kode error baku

| code | status | Arti |
| --- | --- | --- |
| `invalid_request` | 422 | Validasi field, query, atau skema gagal |
| `invalid_credentials` | 422 | Password salah |
| `user_not_found` | 422 | Email tidak terdaftar |
| `account_inactive` | 403 | Akun tidak aktif; gunakan pesan AC-12.07 saat login |
| `session_not_found` | 401 | Sesi hangus |
| `unauthorized` | 401 | Sesi tidak tersedia |
| `not_found` | 404 | Resource tidak ditemukan |
| `forbidden` | 403 | Role/akses objek ditolak |
| `conflict` | 409 | Email/genre terdaftar, stok habis |
| `invalid_state_transition` | 422 | Transisi status tidak diizinkan |
| `invalid_token` | 422 | QR token tidak valid |
| `rate_limit_exceeded` | 429 | Rate limit login/scan |
| `genre_in_use` | 409 | Genre masih digunakan oleh buku atau preferensi Member |
| `account_has_active_loans` | 409 | Akun memiliki peminjaman yang belum dikembalikan |
| `cannot_deactivate_self` | 403 | Admin tidak dapat menonaktifkan akunnya sendiri |
| `internal_error` | 500 | Server error |

## Tabel peran

| Role | Scope |
| --- | --- |
| member | hanya dirinya sendiri |
| admin | semua |

## Message catalog

Setiap pesan error dipetakan ke `code`, status, dan sumber AC. Teks pesan adalah copy resmi (P-06).

| code | status | Pesan | Sumber AC |
| --- | --- | --- | --- |
| `invalid_credentials` | 422 | email and Password tidak sama | AC-02.02 |
| `user_not_found` | 422 | Email Not Registered | AC-02.03 |
| `invalid_request` | 422 | email tidak boleh kosong | AC-02.04 |
| `invalid_request` | 422 | Password tidak boleh kosong | AC-02.04 |
| `invalid_request` | 422 | Field harus diisi! | AC-01.03, AC-05.02, AC-11.03, AC-12.03 |
| `invalid_request` | 422 | Password harus sama | AC-01.04 |
| `invalid_request` | 422 | Format email salah | AC-01.05 |
| `invalid_request` | 422 | Pilih minimal 1 genre | AC-01.06 |
| `conflict` | 409 | Email sudah terdaftar | AC-01.08 |
| `conflict` | 409 | Email sudah terdaftar (balapan register) | AC-01.08 |
| `conflict` | 409 | Genre sudah ada | AC-11.04 |
| `genre_in_use` | 409 | Genre tidak dapat dihapus karena masih digunakan. Nonaktifkan genre jika tidak ingin dipakai lagi. | AC-11.09 |
| `invalid_request` | 422 | Format email salah | AC-12.04 |
| `conflict` | 409 | Email sudah terdaftar | AC-12.04 |
| `invalid_request` | 422 | Password harus sama | AC-12.04 |
| `account_inactive` | 403 | Akun Anda tidak aktif. Silakan hubungi Admin Perpus. | AC-12.07 |
| `account_has_active_loans` | 409 | Akun tidak dapat dinonaktifkan karena masih memiliki peminjaman aktif | AC-12.10 |
| `forbidden` | 403 | Buku tidak dapat dihapus karena masih dipinjam | AC-05.09 |
| `invalid_request` | 422 | Format file cover buku tidak sesuai | AC-05.03 |
| `invalid_request` | 422 | Ukuran file cover buku tidak boleh lebih dari 5Mb | AC-05.04 |
| `invalid_token` | 422 | QR Code tidak valid | AC-08.06 |
| `conflict` | 409 | Buku tidak tersedia (stok habis) | AC-08.04 |
| `invalid_state_transition` | 422 | Transisi status tidak diizinkan | 12-loan-lifecycle-and-fines.md |
| `invalid_request` | 422 | Rating wajib diisi | AC-09.06 |
| `invalid_request` | 422 | Biaya denda wajib diisi dengan angka | AC-09.09 |
| `unauthorized` | 401 | Silahkan login | Q-04 [ASSUMED] |
| `cannot_deactivate_self` | 403 | Admin tidak dapat menonaktifkan akunnya sendiri | AC-12.09 (server-side guard) |
| `rate_limit_exceeded` | 429 | Terlalu banyak percobaan login | Q-04 [COPY-TBD Q-04] |

## Cross-References

- [api-specs/02-authentication.md](02-authentication.md)
- [api-specs/03-books.md](03-books.md)
- [api-specs/04-loans.md](04-loans.md)
- [api-specs/05-notifications.md](05-notifications.md)
- [api-specs/06-dashboard.md](06-dashboard.md)
- [api-specs/07-system.md](07-system.md)
- [12-loan-lifecycle-and-fines.md](../technical-specs/12-loan-lifecycle-and-fines.md)
- [docs/business/acceptance-criteria.md](../business/acceptance-criteria.md)
