---
name: codebase-navigation
description: Navigate the ReadOnly Bun workspace and trace responsibilities safely.
---

# ReadOnly codebase navigation

Start with the repository structure and package manifests, then follow the owning module.

| Area | Location |
| --- | --- |
| ElysiaJS API | `apps/api/src` (`modules/`: `auth`, `books`, `loans`, `notifications`, `dashboard`, `jobs`, `system`; `ports/`: `clock.ts`, `storage.ts`) |
| SolidJS SPA | `apps/web/src` (`pages/`, `components/`, `api/`) |
| Shared contracts & constants | `packages/shared/src` (`api.ts`, `constants.ts`) |
| PostgreSQL / Drizzle ORM | `packages/db` (`src/schema`, `drizzle/`, `seeds/`) |
| Runtime config | `packages/config/src` |
| Documentation | `docs/` (`business/`, `api-specs/`, `technical-specs/`, `task-breakdown/`, `coding-standard/`, `code-review-checklist/`, `deployment-plan/`) |

## Trace a request

1. Find the route mounted in `apps/api/src/app.ts` and `apps/api/src/modules/<module>/<module>.routes.ts`.
2. Follow `<module>.service.ts` -> `<module>.repository.ts` and `<module>.schema.ts`.
3. Inspect shared response types and constants in `packages/shared/src`.
4. For the SolidJS UI, follow `apps/web/src/main.tsx` (TanStack Router) -> `pages/<Feature>Page.tsx` -> `components/<feature>/` -> `api/<feature>.ts`.
5. Run `bun run check` (`bun run typecheck && bun test && biome check`) after changes.
