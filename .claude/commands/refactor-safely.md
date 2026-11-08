---
name: Refactor Safely
description: Plan and execute ReadOnly refactors with dependency, contract, and test evidence
---

# Refactor Safely (ReadOnly)

Refactor only with a defined behavior-preservation goal. A refactor must not silently change an API contract, database schema, RBAC rule, atomic stock/status transition, or verbatim AC copy.

1. Read `CLAUDE.md`, the relevant `docs/` contract, and existing tests.
2. Make the smallest coherent change set within the 7 canonical API modules or SolidJS pages/components.
3. Run `bun run check` and `bun run build:web` to verify zero regressions.
