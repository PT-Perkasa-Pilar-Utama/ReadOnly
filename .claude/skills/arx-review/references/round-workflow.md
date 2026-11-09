# Multi-Round Review Workflow

## Round 1

Perform a complete scoped review. Round 1 is the reviewer's best effort to find every
merge-affecting issue in the current code; later rounds should mostly verify fixes and the delta.

Create a canonical finding set:

```text
F1 Open
F2 Open
F3 Open
```

Record:

- reviewed SHA and base SHA
- base branch
- task/AC
- verification performed
- decision

## Locate previous rounds

Before starting Round 2+, look for the previous report in this order:

1. the project's designated report location (see `project-discovery.md`)
2. the current conversation
3. PR review/comment history
4. an artifact supplied by the user

Use the highest round found as the baseline. If two reports disagree, report the conflict and use
the later one by reviewed SHA order. If no reliable baseline exists, run Round 1 and say why.

## Round 2+

Do not restart numbering.

Example:

```text
Previous:
F1 Open
F2 Open
F3 Open

Current verification:
F1 Resolved
F2 Resolved
F3 Open

New issue:
F4 Open
```

Decision remains Request Changes because F3/F4 are blocking or required.

## Computing the delta

The delta is what the developer changed since the previous reviewed SHA, not what the base branch
changed.

First check ancestry: `git merge-base --is-ancestor <prev> <head>`. When it succeeds, the delta is
`git diff <prev>..<head>`. When it fails, the history was rewritten; use the range-diff rows below.

| Situation                                 | Use                                                                                     |
| ----------------------------------------- | --------------------------------------------------------------------------------------- |
| Linear new commits on top of previous SHA | `git diff <prev>..<head>`                                                               |
| Branch merged the base branch in between  | `git range-diff <base>...<prev> <base>...<head>`, or compare each SHA's merge-base diff |
| Branch was rebased or force-pushed        | `git range-diff <old-base>..<prev> <new-base>..<head>`                                  |
| Previous SHA no longer reachable          | Fetch it from the PR history/ref; if impossible, say so and fully review the current merge-base diff |

Do not attribute base-branch changes to the developer.

## Status vocabulary

Use only: `Open`, `Partial`, `Resolved`, `Deferred`, `Accepted Risk`, `Withdrawn`.

- Do not combine statuses (for example "Partially Resolved — Open"). Use `Partial`.
- `Deferred` and `Accepted Risk` must be granted by the accountable approver and recorded with
  name, date, and (for Deferred) the follow-up item ID. P0 findings cannot use either.
- `Withdrawn` is for reviewer error only. Keep the row and the reason; never delete the ID.

## Resolution verification

A previous finding is Resolved only when the required outcome is verified.

Acceptable evidence may include:

- corrected source
- corrected schema/migration
- required constraint
- new test that fails before/fixes after
- updated authoritative contract
- passing CI for the relevant gate on the reviewed SHA
- explicit decision recorded by the responsible team when the finding was a contract ambiguity

A commit message, PR reply, or checkbox alone is not enough.

## Partial

Use sparingly.

If the core risk remains, status is still merge-blocking.

Explain exactly what was fixed and what remains.

## New findings

A re-review must inspect the delta itself.

A developer can correctly fix F1 while introducing F4.

Assign the next ID after the highest existing ID. Never renumber previous findings.

### Late discovery

If a new finding concerns code that existed unchanged at an earlier reviewed SHA, label it:

```text
F9 — <title> (Late discovery: present since Round 2 SHA <sha>)
```

State briefly why it was missed or why it matters now. Prove the code existed at the earlier SHA
with `git show <sha>:<path>`. Late discoveries are still valid findings, but labeling them keeps the
round history fair and shows reviewer drift.

### Imported findings

Findings raised by another reviewer, a bot, or CI annotations are imported with the next `F<n>` and
a source note (for example `source: human reviewer`, `source: bot`). Verify them like any other
finding before adopting their severity.

## Regression

If a previously Resolved issue becomes broken again:

- keep the original finding ID
- set status back to Open
- explain the regression and evidence

## Stale approval

If HEAD changes after an Approved round:

- approval becomes stale
- compare approved SHA -> new HEAD
- verify all relevant previous guarantees still hold
- review the new delta
- issue a new round or explicit re-review decision for the new SHA

## Merged with open findings

If the change was merged while P0/P1/P2 findings were Open or Partial:

- do not mark them Resolved
- list them in a post-merge note or the next report
- ask the accountable approver to record each as Deferred (with follow-up item) or Accepted Risk,
  or to open a fix item

## Convergence

From Round 4 onward, add a convergence note:

```text
Round | New findings | Late discoveries | Resolved | Still open
R1    | 5            | 0                | 0        | 5
R2    | 2            | 1                | 4        | 3
...
```

Then state one of:

- converging normally
- reviewer drift (many late discoveries): the reviewer should do a full sweep now
- implementation churn (fixes introduce new issues): recommend pairing or a narrower change
- scope ambiguity (findings argue about requirements): recommend clarifying the task/AC

## Round report emphasis

Round 1 emphasizes all findings.

Round 2+ emphasizes:

- previous finding status changes
- remaining open issues
- new findings, with late discoveries labeled
- verification of the delta
- final decision

Do not repeat pages of resolved detail unless it helps auditability.
