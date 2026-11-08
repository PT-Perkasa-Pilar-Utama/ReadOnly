---
name: Debug Issue
description: Systematically diagnose a ReadOnly issue with focused code navigation and evidence
---

# Debug Issue (ReadOnly)

## Investigation Steps

1. Read `CLAUDE.md` and the relevant ReadOnly contracts (`docs/api-specs/`, `docs/business/`, `docs/technical-specs/`).
2. Trace the request path through the applicable boundary:
   - Web (SolidJS): `apps/web/src/pages/` -> `apps/web/src/components/` -> `apps/web/src/api/`.
   - API (ElysiaJS): `apps/api/src/modules/<module>/` (`routes.ts` -> `service.ts` -> `repository.ts` -> `schema.ts`).
   - Database & Shared: `packages/db/src/schema/` and `packages/shared/src/`.
3. Reproduce using `bun test` or `bun run typecheck`.
4. Return a concise report with root cause, file/line evidence, affected AC, and verification steps.
