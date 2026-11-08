# Database workspace (`@readonly/db`)

Workspace untuk Drizzle ORM schema, migrasi PostgreSQL 16, dan seeder `dev` / `qa` (`DB-S1-01`).

## Commands

```bash
bun run db:generate   # Generate Drizzle SQL migrations into packages/db/drizzle
bun run db:migrate    # Apply migrations to DATABASE_URL
bun run db:seed       # Seed development data (Admin + Member + Active Genres + Books)
bun run db:seed:qa    # Seed QA data matching the 12-book / 11-loan Dashboard matrix
```
