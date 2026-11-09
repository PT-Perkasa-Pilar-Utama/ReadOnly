# Report Template

Use concise Markdown. Adapt fields that are unavailable instead of inventing values. Omit optional
sections that do not apply.

Fixed vocabulary:

- Decisions: `Request Changes`, `Approved`, `Review Blocked`
- Severities: `P0 — Critical`, `P1 — Blocker`, `P2 — Required`, `P3 — Advisory`
- Statuses: `Open`, `Partial`, `Resolved`, `Deferred`, `Accepted Risk`, `Withdrawn`
- AC statuses: `Pass`, `Fail`, `Blocked`, `Not verified`

## Round 1 — Request Changes

```markdown
# Round 1 — Request Changes

**PR:** #<number> `<title>`
**Branch:** `<source-branch>`
**Base branch:** `<base-branch>` @ `<base-sha>`
**Reviewed commit:** `<sha>`
**Task:** `<task-id>` — <task title>
**AC:** `<AC-IDs>`
**Standards:** <standards/checklist documents used>
**Decision:** Request Changes

## Summary

- <3–6 bullets; decision first>

## Findings

| ID | Finding   | Severity      | Status |
| -- | --------- | ------------- | ------ |
| F1 | <finding> | P1 — Blocker  | Open   |
| F2 | <finding> | P2 — Required | Open   |
| F3 | <finding> | P3 — Advisory | Open   |

### F1 — <title>

**Location:** `path/to/file.ts` / <symbol>

**Evidence:** <what the code/spec/test shows>

**Impact:** <concrete consequence>

**Required resolution:** <required outcome>

### F2 — <title>

...

## Acceptance Criteria Coverage

<!-- Include when the project requires AC evidence. -->

| AC       | Evidence                                   | Status       |
| -------- | ------------------------------------------ | ------------ |
| AC-01.01 | <test, record, or screenshot at the SHA>   | Pass         |
| AC-01.02 | <only mocked unit test>                    | Not verified |
| AC-01.03 | <dependency card not merged>               | Blocked      |

## Verification Notes

- <check/evidence, tied to the reviewed SHA>
- <explicit limitation if something was not run>
- Review integrity: <what the reviewer did not modify or submit>

## Decision

**Request Changes**

<one or two sentences explaining what still blocks merge>

**Needed from the accountable approver:** <open decisions that belong to a person; omit if none>
```

## Round N — Request Changes

```markdown
# Round <N> — Request Changes

**PR:** #<number> `<title>`
**Branch:** `<source-branch>`
**Base branch:** `<base-branch>` @ `<base-sha>`
**Previous reviewed commit:** `<previous-sha>`
**Reviewed commit:** `<current-sha>`
**Task:** `<task-id>`
**AC:** `<AC-IDs>`
**Standards:** <standards/checklist documents used>
**Decision:** Request Changes

## Summary

- <3–6 bullets; decision first>

## Findings

| ID | Finding                    | Severity      | Status                          |
| -- | -------------------------- | ------------- | ------------------------------- |
| F1 | <finding>                  | P1 — Blocker  | Resolved                        |
| F2 | <finding>                  | P2 — Required | Partial                         |
| F3 | <finding>                  | P2 — Required | Deferred → <CARD-ID> (<approver>, <date>) |
| F4 | <new finding>              | P1 — Blocker  | Open                            |
| F5 | <new finding> (Late discovery) | P2 — Required | Open                        |

## Resolution Verification

### F1 — Resolved

<Evidence that the required outcome is now satisfied on the reviewed SHA.>

### F2 — Partial

<What changed and what requirement remains unmet.>

### F3 — Deferred

<Follow-up item, approver, date, and why the deferral does not hide a P0.>

## New Findings

### F4 — <title>

**Location:** ...
**Evidence:** ...
**Impact:** ...
**Required resolution:** ...

### F5 — <title> (Late discovery: present since Round <k> SHA `<sha>`)

**Location:** ...
**Evidence:** ...
**Impact:** ...
**Required resolution:** ...

## Acceptance Criteria Coverage

<!-- Include when required. -->

## Convergence

<!-- Include from Round 4 onward. -->

| Round | New | Late | Resolved | Still open |
| ----- | --- | ---- | -------- | ---------- |
| R1    | ... | ...  | ...      | ...        |

Assessment: <converging normally | reviewer drift | implementation churn | scope ambiguity>

## Verification Notes

- Delta method: <git diff prev..head | range-diff | merge-base comparison>
- ...
- Review integrity: ...

## Decision

**Request Changes**

<summary of resolved vs remaining blockers>

**Needed from the accountable approver:** <open decisions that belong to a person; omit if none>
```

## Round N — Approved

```markdown
# Round <N> — Approved

**PR:** #<number> `<title>`
**Branch:** `<source-branch>`
**Base branch:** `<base-branch>` @ `<base-sha>`
**Previous reviewed commit:** `<previous-sha>`
**Reviewed commit:** `<current-sha>`
**Task:** `<task-id>`
**AC:** `<AC-IDs>`
**Standards:** <standards/checklist documents used>
**Decision:** Approved

## Summary

- <3–6 bullets; decision first>

## Findings

| ID | Finding   | Severity      | Status   |
| -- | --------- | ------------- | -------- |
| F1 | <finding> | P1 — Blocker  | Resolved |
| F2 | <finding> | P2 — Required | Resolved |

## Re-review Summary

All blocking and required findings from previous review rounds are resolved or carry a recorded
deferral/risk acceptance.

No new P0/P1/P2 regression was identified in the reviewed delta.

## Acceptance Criteria Coverage

<!-- Include when required. Approval requires no AC in Fail; Blocked or Not verified ACs need an
explicit project rule or approver decision that allows merge. -->

## Verification Notes

- <tests/checks/CI on the reviewed SHA>
- <migration/contract evidence if relevant>
- <limitations that do not invalidate approval>
- Review integrity: ...

## Non-blocking Notes

- <optional P3, omit section if none>

## Decision

**Approved**

The decision applies to reviewed commit `<current-sha>`.

**Needed from the accountable approver:** <release/promotion decisions or sign-offs, if any>
```

## No-findings Round 1

If the first review has no blocking/required findings:

```markdown
# Round 1 — Approved
...
## Findings

No P0/P1/P2 findings.

## Verification Notes
...

## Decision

**Approved**

The decision applies to reviewed commit `<sha>`.
```

## Review Blocked

```markdown
# Round <N> — Review Blocked

**PR:** #<number> `<title>`
**Branch:** `<source-branch>`
**Reviewed commit:** `<sha or "unavailable">`
**Task:** `<task-id or "not found">`
**Decision:** Review Blocked

## Blocking Condition

- <what is missing: head SHA, base, task/AC, dependency, access>
- <what was attempted and the observed result>

## Needed to Unblock

- <specific input or action> — <who can provide it>

## Decision

**Review Blocked**

No approval or rejection is issued. Existing findings, if any, keep their previous status.
```

## Post-merge Note

Use when a change was merged while P0/P1/P2 findings were Open or Partial.

```markdown
# Post-merge Note — PR #<number>

**Merged commit:** `<sha>`
**Last reviewed commit:** `<sha>` (Round <N> — <decision>)

| ID | Finding   | Severity      | Status at merge | Required follow-up                |
| -- | --------- | ------------- | --------------- | --------------------------------- |
| F6 | <finding> | P2 — Required | Open            | Deferred → <CARD-ID> or fix card  |

<Ask the accountable approver to record Deferred / Accepted Risk or open a fix item.>
```
