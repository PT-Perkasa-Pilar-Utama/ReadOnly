---
name: add-api-endpoint
description: Add a type-safe ElysiaJS API endpoint in ReadOnly.
---

# Add a ReadOnly API endpoint

Use this skill only after the task card, acceptance criteria, and module boundary are understood. ReadOnly is a Bun workspace monorepo with an **ElysiaJS** API (`apps/api`).

## Allowed Modules

API modules under `apps/api/src/modules/` are strictly limited to:
`auth`, `books`, `loans`, `notifications`, `dashboard`, `jobs`, and `system`.
- **Master Genre** and **Book Ratings** belong to `books` (`genres` and `ratings` are NOT separate modules).
- **Management User** belongs to `auth`.

## Structure

Create the layered files inside the owning module under:

```text
apps/api/src/modules/<module>/<module>.routes.ts
apps/api/src/modules/<module>/<module>.service.ts
apps/api/src/modules/<module>/<module>.repository.ts
apps/api/src/modules/<module>/<module>.schema.ts
apps/api/src/modules/<module>/<module>.test.ts
```

Mount the routes from `apps/api/src/app.ts` under `API_PREFIX` (`/api/v1`). Keep transport parsing in routes, business rules in services, Drizzle queries in repositories, and Zod validation schemas in `packages/shared` or `<module>.schema.ts`.

## Required workflow

1. Confirm the task card in `docs/task-breakdown/`, acceptance criteria in `docs/business/`, and API contract in `docs/api-specs/`.
2. Validate params, query, and JSON/multipart body with Zod; return the standard `ApiSuccessEnvelope` or `ApiErrorEnvelope` with exact verbatim AC messages from `docs/api-specs/01-conventions.md`.
3. Enforce loan status transitions exclusively via `LoanService.transition(...)` and keep stock updates atomic in the same transaction.
4. Do not register `POST /admin/reset-state` or `POST /admin/jobs/run` when `APP_ENV === 'production'` (must return HTTP 404, SEC-13).
5. Add unit/integration tests in `<module>.test.ts` using `bun:test` (inject `ClockPort` for time-dependent logic).
6. Run `bun run check` (`bun run typecheck && bun test && biome check`) before opening the PR, and update the Operation Status Tracker in `docs/api-specs/07-system.md`.

## Review checklist

- [ ] Endpoint is mounted under `/api/v1` and owned by one of the 7 canonical modules.
- [ ] Authentication (`requireAuth`) and RBAC (`requireRole('admin')`) are enforced server-side (SEC-02, SEC-05).
- [ ] Responses use the documented success/error envelope and exact verbatim AC copy.
- [ ] Mutations affecting stock/status/audit (`loan_events`) run inside a single database transaction.
- [ ] `bun run check` passes cleanly.
