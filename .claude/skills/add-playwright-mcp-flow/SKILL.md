---
name: add-playwright-mcp-flow
description: Run and verify a ReadOnly E2E acceptance flow with Playwright.
---

# Run a ReadOnly acceptance flow with Playwright

Use for wiring cards (`FE-S1-07`, `FE-S2-04`, `FE-S3-05`) and acceptance criteria requiring browser verification. The web app is a **SolidJS** SPA (`apps/web`) and the API is **ElysiaJS** (`apps/api`).

- Run against a local non-production stack (`APP_ENV=development` or `APP_ENV=test`) using the QA seed (`POST /api/v1/admin/reset-state?seed=qa`) once the DB and wiring cards are implemented.
- Never run `reset-state` or E2E tests against production (`SEC-13`).
- Assert exact verbatim Acceptance Criteria strings (`docs/business/acceptance-criteria.md` and `docs/business/acceptance-criteria-addendum.md`), role-based redirects (`member` -> Home, `admin` -> Dashboard), and persisted state changes (stock decrement/increment, loan status transitions, login reminder popup ordering).
- For QR confirmation E2E (`US-08`), use the non-production token injection helper or fake media stream documented in `docs/technical-specs/14-qr-borrow-confirmation.md`.
- Run `bun run check` and `bun run build:web` before completing the card.
