# Project Discovery

Use this before reviewing an unfamiliar repository.

## Goal

Discover the project's actual source of truth before applying generic review rules.

## Inspect

Look for:

- `AGENTS.md`
- `CLAUDE.md`
- `CONTRIBUTING.md`
- `README.md`
- `.github/pull_request_template.md`
- `.github/workflows/`
- `CODEOWNERS`
- architecture/HLD/RFC/ADR directories
- coding standards
- code-review checklists
- security standards
- API specifications
- database/data-model specifications
- task breakdowns
- user stories / acceptance criteria
- testing and E2E standards
- migration runbooks
- module ownership rules
- branch, commit, and release conventions

Do not require these exact filenames. Projects organize documentation differently.

## Build a review source map

Before deep review, know:

- What is the base branch, and what is the release/promotion branch?
- What is the PR/task scope, and which card/issue ID owns it?
- Who is the task owner and who is the accountable approver?
- What acceptance criteria are required, and what evidence format does the project require?
- Which docs define the changed behavior?
- Which files are authoritative vs examples?
- What quality gates are mandatory, and which runtime/tool versions are pinned?
- What branch-naming, commit-message, and merge-commit rules apply?
- Which modules or teams own the changed area?
- What language do reports and UI copy use?

## Review report location

Find where review reports live before writing one:

1. explicit user instruction
2. a location named in agent instructions or contributing docs
3. an existing folder that already holds earlier review reports (search for files such as
   `ROUND-*`, `*review*`, `*audit*`)
4. otherwise ask the user once

Then:

- check whether the location is ignored by version control; if it is not, ask before writing
- read the most recent reports for the same card/PR to get the previous round, IDs, and SHA
- follow the existing file-naming convention; use the skill's default only when none exists

## Handle missing standards

If project standards are missing:

- do not create governance documents during review
- review against explicit task requirements, established code behavior, tests, public contracts,
  and generic engineering principles
- note missing documentation only when it creates a concrete merge risk
- do not block merely because the repository lacks a document you prefer

If formal standards are needed, recommend a separate specification/governance task rather than
silently creating them.

## Handle stale documentation

Documentation can lag behind merged code. When a doc's scope statement contradicts the current
code (for example "feature X is not implemented" while it is merged), prefer the more specific and
more recent authoritative source for the changed behavior, report the drift, and do not block the PR
for drift it did not cause.

## Handle conflicts

When project sources disagree:

1. identify both sources precisely
2. determine whether one has explicit precedence
3. if precedence is not defined, report the contract conflict
4. do not invent a canonical value
5. require team/product/architecture resolution when the mismatch affects persisted or public
   behavior

A documentation conflict can be P2 or P1 depending on impact.
