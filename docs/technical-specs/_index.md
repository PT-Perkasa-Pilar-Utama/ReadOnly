**Version:** 0.1
**Date:** 2026-11-05
**Author:** Tech Lead
**Status:** Draft
**Phase:** Technical Specification

# Technical Specs - ReadOnly

## Daftar isi

1. [01. Overview](01-overview.md)
2. [02. System Architecture](02-system-architecture.md)
3. [03. Repository Structure](03-repository-structure.md)
4. [04. Tech Stack](04-tech-stack.md)
5. [05. Module Definitions](05-module-definitions.md)
6. [06. Data Model](06-data-model.md)
7. [07. Security](07-security.md)
8. [08. Non-Functional Requirements](08-non-functional-requirements.md)
9. [09. Authentication and Authorization](09-authentication-and-authorization.md)
10. [10. Integration Points](10-integration-points.md)
11. [11. Environment Configuration](11-environment-configuration.md)
12. [12. Loan Lifecycle and Fines](12-loan-lifecycle-and-fines.md)
13. [13. Stock Integrity and Concurrency](13-stock-integrity-and-concurrency.md)
14. [14. QR Borrow Confirmation](14-qr-borrow-confirmation.md)
15. [15. Scheduler and Notifications](15-scheduler-and-notifications.md)
16. [16. Catalog, Search, Filter, and Recommendations](16-catalog-search-filter-and-recommendations.md)
17. [17. Cover Upload and Storage](17-cover-upload-and-storage.md)

## Companion Documents

| Dokumen | Hubungan |
| --- | --- |
| [../business/acceptance-criteria.md](../business/acceptance-criteria.md) | Spesifikasi teknis menelusuri ke AC |
| [../business/user-story.md](../business/user-story.md) | Menelusuri ke US |
| [../business/sprint-breakdown.md](../business/sprint-breakdown.md) | Scope sprint |
| [../business/acceptance-criteria-breakdown/](../business/acceptance-criteria-breakdown/) | Gherkin per AC |
| [../api-specs/_index.md](../api-specs/_index.md) | Kontrak API menurusi spesifikasi |
| [../coding-standard/_index.md](../coding-standard/_index.md) | Standar kode menurusi kontrol SEC-NN |
| [../code-review-checklist/_index.md](../code-review-checklist/_index.md) | Checklist review |
| [../task-breakdown/_index.md](../task-breakdown/_index.md) | Pemecahan kartu |
| [../deployment-plan/_index.md](../deployment-plan/_index.md) | Deploy + reset state |
| [../GLOSSARY.md](../GLOSSARY.md) | Terminologi kanonik |

## Aturan 9.4 (kepatuhan)

- Setiap keputusan menelusuri ke AC/US atau ke Q-NN bertag `[ASSUMED Q-NN]` / `[COPY-TBD Q-NN]`.
- Tidak ada nomor versi yang tidak terverifikasi (semua `<pin at scaffold>`).
- Konstanta bisnis (7, 3, 2.000, ambang 1–4 dan 5, 5 MiB) didefinisikan di [12-loan-lifecycle-and-fines.md](12-loan-lifecycle-and-fines.md) dan [11-environment-configuration.md](11-environment-configuration.md), bukan environment variable.

## Gate

`python3 .claude/skills/technical-spec/scripts/check_index.py --specs-dir docs/technical-specs`

Skrip tidak tersedia (arsip skill tidak ada di workspace). **Tidak dijalankan.**
