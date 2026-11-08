**Version:** 0.1
**Date:** 2026-11-05
**Author:** Tech Lead
**Status:** Draft
**Phase:** API Specification

# Dashboard API - ReadOnly

Base: `/api/v1/admin/dashboard/summary`

## GET /admin/dashboard/summary

- **Purpose:** ringkasan Dashboard Admin 6 metrik (AC-04.01).
- **Access:** admin.
- **Output:** 200:

```json
{
  "data": {
    "totalBooks": 123,
    "totalAvailability": 98,
    "borrowedCount": 25,
    "overdueCount": 7,
    "returnedCount": 50,
    "pieChart": { "onTime": 40, "late": 10 }
  },
  "message": "ok"
}
```

Definisi (Q-26):
- `totalBooks` = jumlah judul aktif (`deleted_at IS NULL`).
- `totalAvailability` = SUM(`available_count`).
- `borrowedCount` = loans status `BORROWED` **atau** `RETURN_PENDING`.
- `overdueCount` = loans status `OVERDUE` **atau** `FINE_PENDING`.
- `returnedCount` = loans status `RETURNED`.
- `pieChart`: dikembalikan dengan `late_days = 0` vs `> 0`.
- **Traceability:** AC-04.01.
- **Catatan:** metrik Dashboard diuji dengan seed QA yang sudah memuat status pinjaman lanjutan; status seed adalah kebutuhan data uji, bukan urutan atau komitmen antar-sprint.

## Cross-References

- [01-conventions.md](01-conventions.md)
- [06-data-model.md](../technical-specs/06-data-model.md)
- [12-loan-lifecycle-and-fines.md](../technical-specs/12-loan-lifecycle-and-fines.md)
- [docs/deployment-plan/06-database-reset.md](../deployment-plan/06-database-reset.md) (nilai harapan seed QA)
- [docs/business/acceptance-criteria.md](../business/acceptance-criteria.md)
