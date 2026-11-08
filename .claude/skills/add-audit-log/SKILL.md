---
name: add-audit-log
description: Record loan status transitions in loan_events and fine payments in ReadOnly.
---

# ReadOnly audit logging (`loan_events`)

In ReadOnly (`SEC-10`), every loan status transition MUST be recorded in the append-only `loan_events` table inside the same database transaction as the status and stock mutation via `LoanService.transition(...)`.

- Record `loan_id`, `from_status`, `to_status`, `actor_id` (authenticated user ID, or `null` for the automated daily overdue job), and `created_at` (UTC).
- For fine payments (`AC-09.04`, `AC-09.08`), record `fine_paid_at` and `fine_paid_by` (Admin ID) on `loans` and append a `loan_events` entry.
- Never log plaintext `qr_token`, passwords, session tokens, or member PII (`address`, `phone_number`) to application console logs (`SEC-12`, `SEC-14`, `SEC-15`).
- Run `bun run check` (`bun run typecheck && bun test && biome check`) after adding tests for both commit and rollback paths.
