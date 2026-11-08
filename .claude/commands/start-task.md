---
name: Start Task Safely
description: Analyze a ReadOnly request, verify Git state, and define the task before implementation
---

# Start Task Safely (ReadOnly)

Use this workflow before implementing any developer request.

## 1. Understand the Request

1. Read `CLAUDE.md` and identify whether the request is a bug, feature, refactor, documentation, infrastructure, or review task.
2. Locate the matching approved user story (`docs/business/user-story.md`), acceptance criteria (`docs/business/acceptance-criteria.md` and `docs/business/acceptance-criteria-addendum.md`), API spec (`docs/api-specs/`), technical spec (`docs/technical-specs/`), and card in `docs/task-breakdown/`.
3. For Frontend work (SolidJS), check verbatim AC copy requirements and typed API client needs in `apps/web/src/api/`.
4. For Backend work (ElysiaJS + Drizzle), trace the API contract, data model, RBAC (`requireAuth` / `requireRole('admin')`), atomic stock/status transitions (`LoanService.transition`), and `loan_events` audit requirements.

## 2. Verify Git State Before Coding

```powershell
git status --short --branch
git branch --show-current
git log -1 --oneline --decorate
```

## 3. Branch Naming

Follow the canonical ReadOnly branch pattern (`docs/coding-standard/11-pr-hygiene.md`):

```text
<type>/<CARD-ID>-<kebab-title>
```

Examples:
- `feat/DB-S1-01-schema-migrate-seed`
- `feat/BE-S1-02-auth-login`
- `feat/BE-S1-04-master-genre`
- `feat/FE-S1-05-master-genre-ui`

## 4. Quality Gates

Always verify with:

```powershell
bun run check
bun run build:web
```
