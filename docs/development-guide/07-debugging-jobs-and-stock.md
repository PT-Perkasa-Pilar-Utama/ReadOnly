**Version:** 0.1  
**Date:** 2026-11-05  
**Author:** Tech Lead  
**Status:** Draft  
**Phase:** Development Guide  

# Debugging Jobs and Stock

Gunakan query di [07-database-debugging.md](../deployment-plan/07-database-debugging.md).

## Gejala umum

| Gejala | Cek pertama |
| --- | --- |
| Stok negatif ditolak DB | Transaksi tidak memakai conditional update |
| Dua Member dapat stok terakhir | Confirm tidak memakai `available_count > 0` |
| Status tetap BORROWED setelah due date | Advisory lock atau Clock; jalankan job non-prod |
| Denda 1 hari bukan Rp 2.000 | Handler menghitung sendiri, bukan `calculateFine` |
| Notifikasi dobel | Unique `(loan_id, type)` tidak ada |

Jangan perbaiki production dengan `UPDATE status` langsung.

## Cross-References

- [../technical-specs/13-stock-integrity-and-concurrency.md](../technical-specs/13-stock-integrity-and-concurrency.md)
- [../technical-specs/15-scheduler-and-notifications.md](../technical-specs/15-scheduler-and-notifications.md)
