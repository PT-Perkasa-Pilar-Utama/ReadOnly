---
name: developer-pre-pr-checklist
description: Verify ReadOnly changes before opening a pull request.
---

# ReadOnly pre-PR checklist

Tech Lead (TL) is the final reviewer using the 3-round lead-review process (`docs/code-review-checklist/`). One card = one branch (`<type>/<CARD-ID>-<kebab-title>`) = one PR.

## Required checks

Run from the repository root:

```powershell
bunx biome check .
bun run typecheck
bun test
bun run build:web
```

Or run the combined script:

```powershell
bun run check
```

## Self-review

- [ ] Card ID and Acceptance Criteria (`AC-XX.YY`) are referenced in commit messages (`docs/coding-standard/11-pr-hygiene.md`) and `.github/PULL_REQUEST_TEMPLATE.md`.
- [ ] All applicable `SEC-01` .. `SEC-17` items are checked in the PR template (`docs/code-review-checklist/04-security.md`).
- [ ] User-facing UI text and API error messages match the Acceptance Criteria verbatim (`docs/code-review-checklist/06-frontend-copy.md`).
- [ ] Operation Status Tracker in `docs/api-specs/07-system.md` is updated (`TODO` -> `OK`) for completed endpoints.
- [ ] No `.env`, database dumps, cover uploads, or secrets are staged.
