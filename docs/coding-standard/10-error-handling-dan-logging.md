**Version:** 0.1  
**Date:** 2026-11-05  
**Author:** Tech Lead  
**Status:** Draft  
**Phase:** Coding Standard  

# Error Handling dan Logging - ReadOnly

## 10.1 Envelope

Semua error ke klien melewati mapper. Tidak ada stack trace di body (SEC-09). Internal: HTTP 500, `message: "Internal server error"`, `code: internal_error`.

## 10.2 Mapping bisnis

| Situasi | HTTP | code |
| --- | --- | --- |
| Validasi skema | 400 | `invalid_request` |
| Password salah | 422 | `invalid_credentials` (pesan AC-02.02) |
| Email tidak terdaftar | 422 | `user_not_found` (pesan AC-02.03) |
| Stok habis / email duplikat | 409 | `conflict` |
| Transisi status ilegal | 422 | `invalid_state_transition` |
| QR tidak valid | 422 | `invalid_token` |
| Rate limit | 429 | `rate_limit_exceeded` |

Pesan AC-02.02 dan AC-02.03 berbeda sengaja (SEC-16, risiko diterima).

## 10.3 Logging

- Level dari `LOG_LEVEL`. Production: `warn`.
- Field: request id, route, user id (bukan email), status, durasi.
- Dilarang: password, token QR, `SESS_SECRET`, alamat, nomor ponsel, isi cover.

## Cross-References

- [../api-specs/01-conventions.md](../api-specs/01-conventions.md)
- [09-keamanan-dan-rahasia.md](09-keamanan-dan-rahasia.md)
