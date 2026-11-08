**Version:** 0.1  
**Date:** 2026-11-05  
**Author:** Tech Lead  
**Status:** Draft  
**Phase:** Code Review Checklist  

# Data and Migrations

## Items

- [ ] Schema changes live in `packages/db` migrations only.
- [ ] `bun run db:migrate` and `bun run db:seed` resolve their own paths from the repo root.
- [ ] Migrations are expand-then-contract; no production down migration.
- [ ] Business constants are imported from `packages/shared/constants.ts`, not from env.
- [ ] Admin seed reads `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
- [ ] QA seed changes update the arithmetic in [06-database-reset.md](../deployment-plan/06-database-reset.md) in the same PR.
