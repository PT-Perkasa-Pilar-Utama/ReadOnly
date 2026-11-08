---
name: add-drizzle-migration
description: Safely define or change the ReadOnly PostgreSQL schema with Drizzle ORM.
---

# Add a ReadOnly Drizzle migration

Use for an approved task card (starting with `DB-S1-01`) that defines or updates `packages/db/src/schema`.

## Protocol

1. Confirm the table and column definitions against `docs/technical-specs/06-data-model.md` and `docs/technical-specs/12-loan-lifecycle-and-fines.md`.
2. Edit the Drizzle schema in `packages/db/src/schema/` and export all tables and types from `packages/db/src/index.ts`.
3. Generate the migration into `packages/db/drizzle/` using `bun run db:generate` (once configured by `DB-S1-01`). Never hand-edit generated migration SQL.
4. Run `bun run db:migrate` and `bun run db:seed` against the local PostgreSQL container (`docker compose -f docker/compose.yml up db -d`).
5. Run `bun run check` (`bun run typecheck && bun test && biome check`).

## Rules

- Every table must match the canonical column names, types, defaults, and constraints in `06-data-model.md` (`books.available_count >= 0`, `ratings.score` 1..5, `notifications(loan_id, type)` unique, `genres.status`, `users.status`, etc.).
- Foreign keys for `book_genres.genre_id` and `user_genres.genre_id` must prevent deleting a genre that is still in use (`AC-11.09`).
- Never hardcode connection strings in code; always read `DATABASE_URL` from the environment.
- Keep `dev` and `qa` seeds idempotent in `packages/db/seeds/`.
