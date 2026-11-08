**Version:** 0.1  
**Date:** 2026-11-05  
**Author:** Tech Lead  
**Status:** Draft  
**Phase:** Code Review Checklist  

# Tests

Standard: [08-tests.md](../coding-standard/08-tests.md). Commands apply after TL-S1-01.

## Items

- [ ] Unit tests cover new pure functions, including `calculateFine` bounds 0, 1, 4, 5, and 6 when fines change.
- [ ] Time-dependent tests inject Clock; they do not call `Date.now()`.
- [ ] Wiring cards name the Playwright scenarios in the exit criteria.
- [ ] E2E reset uses seed `qa` and the expected dashboard numbers in [06-database-reset.md](../deployment-plan/06-database-reset.md#5-aritmetika-nilai-harapan-dashboard-ac-0401-q-26).
- [ ] CI does not depend on a physical webcam.
