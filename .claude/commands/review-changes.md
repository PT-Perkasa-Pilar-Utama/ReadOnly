---
name: Review Changes
description: Perform a structured, risk-aware ReadOnly code review with evidence
---

# Review Changes (ReadOnly)

Review changes against the assigned card in `docs/task-breakdown/`, ReadOnly API contracts (`docs/api-specs/`), and `docs/code-review-checklist/` (`SEC-01` .. `SEC-17`).

1. Verify API envelopes, status codes, and verbatim AC copy (`docs/api-specs/01-conventions.md`).
2. Verify server-side RBAC (`requireAuth`, `requireRole('admin')`), object-level filtering (`SEC-05`), and atomic stock/status transitions (`LoanService.transition` + `loan_events`).
3. Run `bun run check` and `bun run build:web`.
4. Group findings by High / Medium / Low with file path and line numbers, and end with **Approve**, **Approve with follow-up**, or **Request changes**.
