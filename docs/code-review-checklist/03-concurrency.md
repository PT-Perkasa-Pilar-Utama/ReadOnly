**Version:** 0.1  
**Date:** 2026-11-05  
**Author:** Tech Lead  
**Status:** Draft  
**Phase:** Code Review Checklist  

# Concurrency

Standard: [06-konkurensi-dan-transaksi.md](../coding-standard/06-konkurensi-dan-transaksi.md).

## Items

- [ ] Stock change and loan status change share one transaction.
- [ ] Decrement uses `available_count > 0` conditional update; zero rows become HTTP 409.
- [ ] Status is set only through `LoanService.transition`.
- [ ] QR consume clears `qr_token_hash` in the same transaction as stock decrement.
- [ ] Daily job uses `pg_try_advisory_lock` and exits when the lock is not granted.
- [ ] `late_days` is frozen when `return_requested_at` is set (Q-24).
