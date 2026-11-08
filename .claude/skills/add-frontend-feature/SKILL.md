---
name: add-frontend-feature
description: Build a SolidJS SPA page or feature in ReadOnly with real API-backed behavior.
---

# Add a ReadOnly frontend feature

ReadOnly uses **SolidJS**, Vite, TypeScript strict, **TanStack Solid Router** (`@tanstack/solid-router`), and **TanStack Solid Query** (`@tanstack/solid-query`). Do NOT use React, React Router, or React Hook Form.

## Structure

```text
apps/web/src/pages/<Feature>Page.tsx      <- Route page connected to TanStack Router
apps/web/src/components/<feature>/        <- Presentational and interactive SolidJS components
apps/web/src/api/<feature>.ts             <- Typed API client functions (no raw fetch in components)
apps/web/src/<feature>.test.tsx           <- Component / flow tests
```

## Rules

1. **Verbatim AC Copy:** User-facing labels, buttons, alerts, popups, and inline validation messages MUST match the Acceptance Criteria in `docs/business/acceptance-criteria.md` and `docs/business/acceptance-criteria-addendum.md` character-for-character (including `email and Password tidak sama`, `Email Not Registered`, `Field harus diisi!`, `Akun Anda tidak aktif. Silakan hubungi Admin Perpus.`, etc.).
2. **Typed API Client Only:** Components and pages must never call `fetch` directly; route all HTTP requests through `apps/web/src/api/`.
3. **SolidJS Reactivity:** Preserve reactivity by accessing signals as functions (`count()`), using `<For>` / `<Show>`, and avoiding destructuring props directly.
4. **Responsive & Secure Context:** Support both desktop and mobile viewports. Admin QR camera scanner (US-08) requires HTTPS in staging/production (`localhost` allowed in dev, SEC-17).

## Workflow

1. Read the task card in `docs/task-breakdown/`, acceptance criteria in `docs/business/`, and API contract in `docs/api-specs/`.
2. Add or update the typed client call in `apps/web/src/api/`.
3. Implement loading, empty (`Genre tidak ditemukan`, `User tidak ditemukan`), error, confirmation alert, and success states.
4. Wire the route in `apps/web/src/` router configuration with role guards (`member` vs `admin`).
5. Run `bun run check` and `bun run build:web` before opening the PR.
