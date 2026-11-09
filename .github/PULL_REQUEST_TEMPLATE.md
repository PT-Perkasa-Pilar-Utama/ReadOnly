## Task Reference

- Task/Card ID: <!-- One card per PR, e.g. BE-S1-03 or FE-S2-02 -->
- User Story(s): <!-- Include every related US for a cross-US card -->
- PM Sprint: <!-- Use the sprint selected in Planning; S1/S2/S3 card prefixes are historical groups -->
- AC covered: <!-- Use exact IDs, e.g. AC-01.01, AC-01.08 -->
- Huly issue: <!-- Link or ID, if the card is tracked in Huly -->

## Target Branch

<!-- Feature PRs normally target dev. Use main only for a release PR led by the Tech Lead. -->

- [ ] `dev`
- [ ] `main` (release)

## Type of Change

- [ ] `feat`: New functionality
- [ ] `fix`: Bug fix
- [ ] `refactor`: Refactoring without intended behavior change
- [ ] `test`: Add or update tests
- [ ] `docs`: Documentation only
- [ ] `chore`: Build process or auxiliary tooling

## What Changed

<!-- Summarize the changes at a high level. -->

-
-

## Why

<!-- Explain the business or technical reason for this change. -->


## How to Test

<!-- Give reproducible steps. Reference QA seed users and sample data when relevant. -->

1.
2.


## Screenshots (Frontend Changes)

<!-- Attach before/after screenshots when UI changes. Remove this section if not applicable. -->


## Security Review (SEC-NN)

Review every applicable control in [04-security.md](../docs/code-review-checklist/04-security.md). Mark a control only after verifying it. Mark a control N/A only when this PR does not touch it, and explain why under N/A notes.

- [ ] SEC-01: Passwords use bcrypt before persistence; rounds come from environment configuration.
- [ ] SEC-02: Routes require authentication; Admin routes require the Admin role.
- [ ] SEC-03: Session cookie attributes, stored token hash, and logout behavior are verified.
- [ ] SEC-04: State-changing requests enforce CSRF / Origin protections.
- [ ] SEC-05: Member repository queries scope records by `user_id`.
- [ ] SEC-06: Sensitive login, registration, and QR endpoints are rate-limited.
- [ ] SEC-07: Request bodies use shared schemas; raw request bodies are not trusted.
- [ ] SEC-08: CORS, CSP, and security headers match the specification.
- [ ] SEC-09: Internal stack traces are not exposed in HTTP 500 responses.
- [ ] SEC-10: Loan status transitions and fine payments have the required audit trail.
- [ ] SEC-11: Fine calculation and manual fine bounds follow the specification.
- [ ] SEC-12: QR tokens use 128-bit CSPRNG, SHA-256 storage, single use, and are never logged.
- [ ] SEC-13: Reset and job-run endpoints are not registered in production.
- [ ] SEC-14: Secrets come from environment configuration and are not committed or logged.
- [ ] SEC-15: PII is absent from logs and dashboards; authorized Admin responses follow the access exception.
- [ ] SEC-16: Login enumeration behavior and rate limiting preserve the accepted risk.
- [ ] SEC-17: Camera APIs require a secure context; localhost is the only HTTP exception.

**N/A controls and rationale:** <!-- List SEC-NN controls that do not apply, or write None. -->


## Pre-PR Checklist

- [ ] Branch follows `<type>/<CARD-ID>-<kebab-description>` and this PR covers exactly one task card.
- [ ] Commit subjects follow the English imperative format in [11-pr-hygiene.md](../docs/coding-standard/11-pr-hygiene.md).
- [ ] I reviewed the applicable items in the [code review checklist](../docs/code-review-checklist/_index.md), including contract/AC traceability and tests.
- [ ] `bun run check` passes (`typecheck`, tests, and Biome).
- [ ] `bun run build:web` passes for frontend changes.
- [ ] Relevant Playwright scenarios pass for wiring changes when the E2E harness is available; otherwise, explain the limitation in How to Test.
- [ ] Every listed AC is verified, including its THEN outcomes; for documentation-only changes, explain why code tests do not apply.
- [ ] Huly issue status is `In Review`, if the task is tracked in Huly.
- [ ] Operation Status Tracker in [`docs/api-specs/07-system.md`](../docs/api-specs/07-system.md) is updated from `TODO` to `OK` only for operations completed by this card.
- [ ] If the schema changed, migration files were generated with `bun run db:generate` after syncing with the target branch and reviewed.
- [ ] No `.env`, `*.pem`, database dump, real cover, or other secret files are included.
- [ ] Reviewer is TL, or BE1/FE1 by area for a TL-owned card (`[ASSUMED Q-37]`).
