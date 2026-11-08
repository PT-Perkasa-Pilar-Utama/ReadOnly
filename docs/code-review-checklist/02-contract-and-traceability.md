**Version:** 0.1  
**Date:** 2026-11-05  
**Author:** Tech Lead  
**Status:** Draft  
**Phase:** Code Review Checklist  

# Contract and Traceability

## Items

- [ ] Every changed endpoint matches the operation in `docs/api-specs/`.
- [ ] Success and error envelopes match [01-conventions](../api-specs/01-conventions.md).
- [ ] Operation Status Tracker row moves from `TODO` to `OK` only for operations finished by this card.
- [ ] Each THEN clause of the listed AC is demonstrated in code or in a test named in the PR.
- [ ] No new AC ID appears under `docs/business/` or `docs/task-breakdown/`.
- [ ] Assumptions carry `[ASSUMED Q-NN]` or `[COPY-TBD Q-NN]`, not an untagged placeholder.
