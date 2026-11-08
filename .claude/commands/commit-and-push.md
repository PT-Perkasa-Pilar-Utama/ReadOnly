---
name: Commit and Push Safely
description: Commit and push ReadOnly changes only after preflight, verification, and remote-divergence checks
---

# Commit and Push Safely (ReadOnly)

Use this workflow whenever a developer explicitly asks to commit or push.

## Pre-Commit Gate

1. Inspect `git status --short` and `git diff --stat`.
2. Confirm the current branch follows `<type>/<CARD-ID>-<kebab-title>` and is not `dev` or `main`.
3. Stage only intended paths with explicit `git add <path>` commands. Never use `git add -A` or `git add .`.
4. Ensure no `.env`, database dumps, cover uploads, or secrets are staged (`SEC-14`).
5. Run the ReadOnly quality gates:

   ```powershell
   bun run check
   bun run build:web
   ```

6. Create a commit following `docs/coding-standard/11-pr-hygiene.md`:

   ```gitcommit
   <type>(<scope>): <short summary>

   Refs: <CARD-ID>
   AC: <AC-XX.YY>
   Tags: [ASSUMED Q-NN] (optional)
   ```

## Pre-Push Gate

1. Fetch without modifying the worktree (`git fetch --prune origin`).
2. Push with a normal push only (`git push -u origin HEAD`). Never force push.
