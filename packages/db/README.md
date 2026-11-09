# Database workspace (`@readonly/db`)

Workspace untuk Drizzle ORM schema, migrasi PostgreSQL 16, dan seeder `dev` / `qa` (`DB-S1-01`).

## Commands

```bash
bun run db:generate   # Generate Drizzle SQL migrations into packages/db/drizzle
bun run db:migrate    # Apply migrations to DATABASE_URL
bun run db:seed       # Seed development data (5 users, 5 genres, 5 books, 5 loans, 3 notifications, 2 ratings)
bun run db:seed:qa    # Seed QA data matching the 12-book / 11-loan Dashboard matrix
```

## Default Seed Accounts (`dev` & `qa`)

| Role | Email | Password | Status |
| --- | --- | --- | --- |
| Admin Perpus | `admin@readonly.ppu.co.id` | `password123` | `active` |
| Member 1 | `member1@readonly.ppu.co.id` | `password123` | `active` |
| Member 2 | `member2@readonly.ppu.co.id` | `password123` | `active` |
| Member 3 (`dev` seed) | `member3@readonly.ppu.co.id` | `password123` | `active` |
| Member Nonaktif | `inactive@readonly.ppu.co.id` | `password123` | `inactive` |
