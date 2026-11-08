---
name: Explore Codebase
description: Navigate and understand ReadOnly with focused architecture and dependency tracing
---

# Explore Codebase (ReadOnly)

## Exploration Steps

1. Read `CLAUDE.md`, then identify the relevant source of truth:
   - Product and 77 ACs: `docs/business/acceptance-criteria.md` and `docs/business/acceptance-criteria-addendum.md`.
   - API contracts (36 operations): `docs/api-specs/`.
   - Architecture and data model: `docs/technical-specs/`.
   - Task cards: `docs/task-breakdown/`.
2. Narrow to the relevant workspace package:
   - Web (SolidJS + TanStack Router/Query): `apps/web/src/`.
   - API (ElysiaJS on Bun): `apps/api/src/modules/` (`auth`, `books`, `loans`, `notifications`, `dashboard`, `jobs`, `system`).
   - Shared & DB: `packages/shared/src/`, `packages/db/`, `packages/config/src/`.
3. State observed architecture, entry points, and open questions with file-path evidence.
