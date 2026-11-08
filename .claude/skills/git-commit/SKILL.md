---
name: git-commit
description: Create a scoped ReadOnly commit following docs/coding-standard/11-pr-hygiene.md
---

# Skill: git-commit (ReadOnly)

## When to Use

Use only after a developer explicitly asks to commit, the assigned ReadOnly task card is complete, and verification checks pass.

## Required Pre-Commit Checks

1. Read `CLAUDE.md`, the assigned task card in `docs/task-breakdown/`, and `docs/coding-standard/11-pr-hygiene.md`.
2. Inspect the worktree:

   ```powershell
   git status --short
   git diff --stat
   git diff --check
   ```

3. Stage only the intended files with explicit paths (`git add <file>`). Never use `git add -A` or `git add .`.
4. Ensure no `.env`, database dumps, cover storage files, or credentials are staged (`SEC-14`).
5. Run the quality gates:

   ```powershell
   bun run check
   bun run build:web
   ```

## Commit Message Format (`docs/coding-standard/11-pr-hygiene.md`)

```gitcommit
<type>(<scope>): <short summary>

Refs: <CARD-ID>
AC: <AC-XX.YY>
Tags: [ASSUMED Q-NN] (optional)
```

Allowed types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`.
Allowed scopes: `auth`, `books`, `loans`, `notifications`, `dashboard`, `jobs`, `system`, `db`, `shared`, `web`, `docs`.
