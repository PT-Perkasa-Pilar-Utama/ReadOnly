# Severity Model

Use severity to communicate merge impact, not reviewer emotion.

## P0 — Critical

Immediate stop.

Typical examples:

- committed live production credentials/private keys
- destructive migration that can irreversibly lose critical production data
- obvious critical cross-tenant/system authorization exposure
- code path that can execute dangerous production behavior without required safeguards

Decision: Request Changes.

P0 usually deserves immediate escalation beyond normal PR review. A P0 cannot be Deferred or
Accepted Risk.

## P1 — Blocker

Required before merge because correctness, security, data integrity, or a core contract is broken.

Typical examples:

- database invariant not enforced where concurrency can violate it
- required authorization missing
- persisted/public enum contracts disagree
- migration cannot safely apply
- retry can duplicate irreversible side effects
- transaction boundary permits partial committed state violating the domain
- implementation contradicts an acceptance-critical API contract
- an acceptance criterion in the task scope is not implemented at all

Decision: Request Changes.

## P2 — Required

Must be resolved before merge, but impact is below P1.

Typical examples:

- required test/evidence missing
- acceptance edge path not implemented
- acceptance evidence produced only against mocks when the project requires real-stack evidence
- an endpoint or UI returns success with placeholder, empty, or fake data presented as a finished
  feature
- project-required docs remain stale after a contract change
- error mapping violates an agreed response contract
- required operational/migration instructions missing
- PR template evidence required by team process is incomplete
- violation of an explicit, enforced project rule (unsafe type casts, file-size limits, forbidden
  logging of sensitive data, branch/commit conventions) even when the rule is stylistic
- branch is behind its base when the project requires it to be current

Decision: Request Changes.

## P3 — Advisory

Non-blocking improvement.

Typical examples:

- clearer naming
- small maintainability improvement
- optional test hardening
- local simplification
- style/readability issue with no correctness impact and no enforced project rule behind it

Decision: may still be Approved.

## Calibration rules

- Do not inflate severity to force attention.
- Do not downgrade real data/security problems to avoid friction.
- P0/P1/P2 are merge-blocking while Open or Partial.
- P3 must not be used as a disguised blocker.
- Project rule beats reviewer taste: if the project explicitly forbids it, it is at least P2; if
  only the reviewer dislikes it, it is P3.
- Apply the same severity to the same kind of issue within one review. When two findings look alike
  but have different severities, explain the difference.
- When severity is uncertain, explain the uncertainty and choose based on demonstrated impact.
- Keep severity stable across rounds unless new evidence materially changes the impact; explain any
  severity change.

## Severity and non-blocking statuses

`Deferred` and `Accepted Risk` change whether a finding blocks this merge, not its severity. Keep the
original severity in the findings table so the follow-up keeps its priority.
