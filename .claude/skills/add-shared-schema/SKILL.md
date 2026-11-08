---
name: add-shared-schema
description: Add a cross-package ReadOnly contract or business constant in packages/shared.
---

# Add shared schema or constants (ReadOnly)

Use `packages/shared/src` for stable API envelopes, pagination schemas, domain constants (`packages/shared/src/constants.ts`), enums, and Zod validation schemas shared between `apps/api` and `apps/web`.

1. Confirm the contract against `docs/api-specs/` and `docs/technical-specs/12-loan-lifecycle-and-fines.md`.
2. Keep business constants (7-day loan duration, 3-day reminder, Rp 2.000 flat fine for 1-4 late days, >= 5 days manual fine threshold, 5 MiB max cover size, 6 canonical loan statuses) in `packages/shared/src/constants.ts` and export from `packages/shared/src/index.ts`.
3. Add unit tests in `packages/shared/src/*.test.ts` (including boundary tests for `calculateFine`: late days 0, 1, 4, 5, 6).
4. Run `bun run check` (`bun run typecheck && bun test && biome check`).

Do not import app-specific modules (`apps/api` or `apps/web`) into `packages/shared`.
