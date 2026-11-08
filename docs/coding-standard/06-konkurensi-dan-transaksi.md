**Version:** 0.1  
**Date:** 2026-11-05  
**Author:** Tech Lead  
**Status:** Draft  
**Phase:** Coding Standard  

# Konkurensi dan Transaksi - ReadOnly

## 6.1 Batas transaksi

Satu transaksi mencakup: perubahan `loans.status`, perubahan `books.available_count`, baris `loan_events`, dan (bila ada) pembayaran denda. Tidak ada commit parsial di tengah transisi (spek 13).

## 6.2 Decrement / increment stok

```sql
UPDATE books
SET available_count = available_count - 1
WHERE id = :bookId AND available_count > 0 AND deleted_at IS NULL;
```

Nol baris = stok habis. Abort, pinjaman tetap `PENDING`, HTTP 409 (Q-15, AC-08.04). Increment pengembalian simetris, tanpa syarat `> 0` pada increment, tetapi tetap dalam transaksi dengan transisi status.

## 6.3 Transisi status

- Hanya `LoanService.transition(...)`.
- Guard `WHERE id = :id AND status = :expected`. Nol baris = `InvalidStateTransitionError` (422).
- Dilarang `UPDATE loans SET status = ...` di handler atau di skrip ad-hoc, kecuali insiden yang dicatat TL.

## 6.4 Advisory lock job

Job harian memakai `pg_try_advisory_lock`. Jika lock tidak didapat, proses keluar tanpa error. Catch-up di boot mengisi transisi yang tertunda (Q-31).

## 6.5 Token QR sekali pakai

Konsumsi token: `UPDATE ... SET qr_token_hash = NULL WHERE qr_token_hash = :hash AND status = 'PENDING'` dalam transaksi yang sama dengan decrement stok. Nol baris = AC-08.06.

## Cross-References

- [../technical-specs/13-stock-integrity-and-concurrency.md](../technical-specs/13-stock-integrity-and-concurrency.md)
- [../code-review-checklist/03-concurrency.md](../code-review-checklist/03-concurrency.md)
