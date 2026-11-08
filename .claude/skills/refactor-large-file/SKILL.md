---
name: refactor-large-file
description: Split an oversized ReadOnly source file without changing behavior.
---

# Refactor a ReadOnly large file

Use after confirming the responsibility and dependency graph. Preserve the public contract, API envelopes, and verbatim AC copy.

1. Run `bun run check` to verify the baseline passes.
2. Extract pure helpers, Zod schemas, Drizzle repositories, or SolidJS subcomponents before changing control flow.
3. Keep API code inside the 7 canonical modules in `apps/api/src/modules/<module>/`, SolidJS pages/components in `apps/web/src/pages/` and `apps/web/src/components/`, API clients in `apps/web/src/api/`, and shared contracts/constants in `packages/shared/src/`.
4. Re-run `bun run check` and `bun run build:web` to confirm zero regressions.
