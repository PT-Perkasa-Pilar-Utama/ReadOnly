# Promotion Review

Use this when an integration branch is promoted to a release branch (for example `dev` -> `main`),
or when a release candidate is cut from accumulated merges.

A promotion review checks that the **resulting tree** is what the team intends to release. The list
of commits can look correct while the merged content is not.

## Why the commit list is not enough

Git merges by content relative to the merge-base. If the target branch contains a revert of an
earlier promotion, a normal merge treats that revert as the target's intentional change. Any file
the source branch has not touched since the merge-base stays reverted after the merge, without a
conflict and without appearing in the PR's commit list.

Squash merges, cherry-picks, and hotfixes applied directly to the target create similar silent
differences.

## Workflow

1. Identify source SHA, target SHA, and `git merge-base <target> <source>`.
2. List commits on the target that are not on the source:
   `git log --oneline <source>..<target>`. Flag reverts, hotfixes, and direct commits.
3. Compute the intended tree: the source tree, plus any target-only hotfix the team wants to keep.
4. Compute the actual post-merge tree in a temporary worktree:
   `git worktree add --detach <temp-dir>/arx-promo <target-sha>`, then inside it
   `git merge --no-commit --no-ff <source-sha>`.
5. Compare actual vs intended inside that worktree and split the result into two lists:
   - conflicted files: `git diff --name-only --diff-filter=U` (visible to whoever merges)
   - silent differences: `git diff --cached --name-only <source-sha>` minus the conflicted files
     (the merge result differs from the source without any conflict)

   Every silent difference must be explained (an intended hotfix) or is a finding. Silent
   differences are the dangerous list because nobody is prompted to look at them. Run
   `git merge --abort` before removing the worktree.

On git 2.38+, the same simulation is available read-only, without a worktree:
`git merge-tree --write-tree --name-only <target-sha> <source-sha>` prints the merged tree id and the
conflicted file names; diff the printed tree against the source
(`git diff --name-only <merged-tree> <source-sha>`) and subtract the conflicted files to get the
silent-difference list.
6. For each revert on the target, cross-check its files against the silent-difference list. Do not
   rely only on "files the source has not touched since the merge-base"; that heuristic
   undercounts, so the tree simulation in step 5 is the evidence.
7. Check migrations: list migrations present on source but not applied in the target environment,
   and confirm their order and immutability.
8. Check release evidence: CI on the exact source SHA, required acceptance sign-off, and release
   notes or version labels the project requires.
9. Discard the temporary worktree.

## Typical findings

| Finding                                                        | Usual severity |
| -------------------------------------------------------------- | -------------- |
| Merge would keep a revert on files the release must include    | P1             |
| Target-only hotfix would be lost or duplicated                 | P1             |
| Migration order differs between target history and source      | P1             |
| Required acceptance sign-off missing for included cards        | P2             |
| Release notes / version label missing when the project requires them | P2       |

## Resolution options to suggest

Present options; the accountable approver decides:

- revert the revert on a promotion branch before merging
- reset or rebuild the release branch from the merge-base under the approver's control
- cherry-pick or re-apply the intended hotfix explicitly

Do not perform any of these during review.

## Report

Use the normal report template with `Mode: Promotion review`, source and target SHAs, the merge-base,
and a short table of tree differences that remain unexplained.
