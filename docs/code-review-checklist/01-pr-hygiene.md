**Version:** 0.1  
**Date:** 2026-11-05  
**Author:** Tech Lead  
**Status:** Draft  
**Phase:** Code Review Checklist  

# PR Hygiene

Aturan lengkap hanya di [11-pr-hygiene.md](../coding-standard/11-pr-hygiene.md). Checklist ini hanya menaut, tidak menyalin.

## Items

- [ ] Branch matches `<type>/<CARD-ID>-<kebab>`.
- [ ] Exactly one Card ID in this PR.
- [ ] Commit subject is English imperative and uses the single fence in [11-pr-hygiene](../coding-standard/11-pr-hygiene.md#commit).
- [ ] PR template filled (AC list, test notes, SEC items touched).
- [ ] No `.env`, dump, or real cover files in the diff.
- [ ] Reviewer is TL, or BE1/FE1 by area when the card owner is TL (`[ASSUMED Q-37]`).
