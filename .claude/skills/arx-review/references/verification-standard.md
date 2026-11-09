# Verification Standard

## Principle

Verification claims must be auditable.

Never say:

- tests pass
- build passes
- migration works
- CI is green
- finding is resolved

unless there is evidence for that statement.

## Evidence hierarchy

Prefer, when available:

1. project CI/check result for the reviewed SHA
2. locally executed project-defined quality gate on the reviewed SHA
3. targeted locally executed tests/checks on the reviewed SHA
4. static code/spec inspection
5. developer-provided evidence that can be independently checked

Do not treat screenshots or comments as stronger than executable evidence when executable evidence
is reasonably available.

## Obtaining the exact head

Try these in order and record which one worked:

1. Hosting CLI or connector: read PR head SHA, base SHA, mergeability, and checks.
2. `git ls-remote origin "refs/pull/<N>/head"` to learn the head SHA without a CLI.
3. `git fetch origin "pull/<N>/head:refs/arx/pr-<N>"` (GitHub) or the platform's equivalent
   merge-request ref; for a plain branch, `git fetch origin <branch>`. If `origin` is a fork, use the
   upstream repository URL instead: a fork does not serve the PR's `pull/<N>/head` ref.
4. Create a temporary worktree outside the developer's checkout:
   `git -c core.autocrlf=false worktree add --detach <temp-dir>/arx-pr-<N> <sha>` (the flag avoids
   line-ending rewrites in the temporary checkout).
5. Run checks there. Remove the worktree when done (`git worktree remove <path>`), and delete the
   `refs/arx/*` ref if the user does not want it kept.

Notes:

- Never check out, reset, or stash in the user's working tree for verification.
- On Windows, keep the temporary path short; long paths can break dependency installation.
- If worktree removal fails on Windows long paths, use a removal method that supports long paths,
  then run `git worktree prune`.
- After cleanup, confirm the developer's checkout has the same `git status` as when the review
  started.
- If `.git/FETCH_HEAD` or the object database is not writable, report it as an environment
  limitation and rely on exact-head CI evidence instead.
- A code graph, cache, or index built at another SHA is navigation context only.

## Verifying developer claims

Make a table of every developer claim: `claim | how it was checked | result`. Valid results:
`Verified`, `Contradicted`, or `Not verified` with the reason.

Specific recipes:

- "Amended and force-pushed": check the commit list and ancestry, not the description.
- "Pushed" or "push pending": check the remote ref, not the message.
- A SHA written in a document, report, or screenshot should match the commit that produced it;
  check the document header and the artifact together.
- "All gates pass" or "tests pass": run the gates yourself, and report the count you measured plus
  which run it came from when it differs from the developer's claim.
- "The change deletes/reverts/truncates X": a two-dot diff against a moved base shows false
  deletions. Confirm with the three-dot diff and a merge simulation before reporting it:
  `git merge-tree --write-tree <target> <head>` (git 2.38+), or in a temporary worktree
  `git merge --no-commit --no-ff <head>` followed by `git merge --abort`.
- Evidence gathered on a runtime that differs from the pinned one is weaker; say so.

## Safe commands

Common examples:

```bash
git diff --check <base-sha>...<head-sha>
git status
# project-defined typecheck/lint/test/build commands
```

Use the repository's canonical commands whenever possible, and match the project's pinned runtime
and tool versions. Record a version mismatch when it could affect the result.

## Database/migration verification

For schema work, consider:

- clean database migration application
- upgrade from previous schema where relevant
- constraint behavior
- rollback only when project supports/tests rollback
- integration tests against disposable PostgreSQL/MySQL/etc.
- generated migration matching source schema
- migrations already applied on shared environments remain unchanged

Never run destructive verification against production, shared, or the developer's own databases. Use
only disposable infrastructure, and remove it when done.

## CI

When CI is available:

- confirm checks correspond to the reviewed SHA
- distinguish pending, skipped, failed, and successful
- inspect relevant failed logs before attributing a failure to the PR
- do not call an old successful run evidence for a newer HEAD
- note when a required job did not run (path filters, draft state, skipped conditions)

## Acceptance evidence

When the project requires acceptance evidence, check that each AC record names:

- environment and reviewed SHA
- role/test account
- input data
- expected result
- observed result
- screenshots/logs for failures or UI behavior

Evidence produced against mocks or fixtures does not prove behavior that the AC defines against the
real API, queue, storage, or database. Mark such ACs `Not verified`, not `Pass`.

If a dependency needed to verify an AC is not implemented or not available, mark it `Blocked`.

## Environment limitations

If verification cannot run:

```text
Check: integration test suite
Status: Not run
Reason: disposable PostgreSQL is unavailable in the current environment
Impact: database constraint behavior is verified statically only
```

If the project requires that evidence before merge, keep approval blocked until it exists. Give the
exact command that would produce the missing evidence, so the user can run it.

## Mutation check

To test whether a test actually guards the behavior it claims, in a temporary worktree change the
one thing the test should catch, run only that test, confirm it fails, then restore the file and
confirm the tree is clean. Never do mutation checks in the developer's checkout.

## Review integrity

Every report ends its Verification Notes with a statement of what the reviewer did not do, for
example:

```text
Review integrity: no source, configuration, branch, or commit was modified; no review was submitted
to the hosting platform; temporary worktree <path> was removed.
```

## Verification and findings

A test can prove expected behavior, but passing tests do not automatically prove the
implementation is correct if:

- required cases are missing
- a database invariant is not represented
- security boundaries are untested
- the test asserts implementation details instead of behavior

Likewise, missing a test is not automatically a blocker. Tie required coverage to risk, project
standards, or acceptance criteria.
