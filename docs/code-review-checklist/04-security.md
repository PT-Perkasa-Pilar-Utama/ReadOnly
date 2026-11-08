**Version:** 0.1  
**Date:** 2026-11-05  
**Author:** Tech Lead  
**Status:** Draft  
**Phase:** Code Review Checklist  

# Security

One binary item per SEC-NN in [07-security.md](../technical-specs/07-security.md). Mark N/A only when the PR does not touch that control, and say so in the PR body.

## Items

SEC-15 menyesuaikan kebutuhan akses Management User pada AC-12.01 dan AC-12.05. Pengecualian ini terbatas pada endpoint Admin yang diotorisasi; larangan log dan Dashboard tetap berlaku.

- [ ] SEC-01: password hashed with bcrypt in the API before persist; rounds read from env; no bcrypt in the repository. See [9.1 Hash password](../coding-standard/09-keamanan-dan-rahasia.md#91-hash-password).
- [ ] SEC-02: every route uses `requireAuth`; admin routes use `requireRole('admin')`.
- [ ] SEC-03: session cookie is HttpOnly, Secure, SameSite=Lax; only `token_hash` is stored; logout deletes the session row.
- [ ] SEC-04: state-changing requests check `Sec-Fetch-Site` or CSRF, and admin routes check `Origin`.
- [ ] SEC-05: member queries filter `user_id` in the repository, not only in the handler.
- [ ] SEC-06: login, register, and QR scan return 429 `rate_limit_exceeded`. Message text is `[COPY-TBD Q-04]`.
- [ ] SEC-07: request bodies are parsed by `packages/shared` schemas; no raw `req.body`.
- [ ] SEC-08: CORS origin is a single env value, not `*`; CSP and security headers match the spec.
- [ ] SEC-09: HTTP 500 body is `Internal server error`; stack traces stay in logs.
- [ ] SEC-10: each status transition appends `loan_events`; fine payment records `fine_paid_at` and `fine_paid_by`.
- [ ] SEC-11: days 1-4 use `calculateFine` (Rp 2.000); days >= 5 accept integer 1..99999999 only.
- [ ] SEC-12: QR token is 128-bit CSPRNG, stored as SHA-256, single use, never logged.
- [ ] SEC-13: `POST /admin/reset-state` and `POST /admin/jobs/run` are not registered when `APP_ENV` is production (404, not 403).
- [ ] SEC-14: secrets come from the environment; none are committed or logged.
- [ ] SEC-15: address and phone number are absent from logs and dashboard; phone may appear only in authorized Admin Management User responses (AC-12.01), and address only in authorized edit-user context (AC-12.05).
- [ ] SEC-16: AC-02.02 and AC-02.03 keep distinct BA messages; enumeration risk stays accepted and rate-limited.
- [ ] SEC-17: camera APIs run only in a secure context; localhost is the only HTTP exception.
