---
name: add-simpan-kirim-form
description: Add a draft-and-submit form only when a ReadOnly task card explicitly requires it.
---

# Draft and submit forms (ReadOnly)

ReadOnly forms (Register, Login, Master Buku, Master Genre, Management User, Feedback Buku, Biaya Denda) submit directly to the API and are NOT draft-and-submit forms. Use this skill only if a future requirement explicitly asks for local draft persistence.

- Never store tokens, passwords, or PII in `localStorage`.
- Route all API calls through `apps/web/src/api/`.
- Run `bun run check` and `bun run build:web`.
