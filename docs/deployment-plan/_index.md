**Version:** 0.1  
**Date:** 2026-11-05  
**Author:** Tech Lead  
**Status:** Draft  
**Phase:** Deployment Plan  

# Deployment Plan - ReadOnly

Runbook target deployment, topologi infrastruktur, release, rollback, reset, dan debugging database. Scaffold saat ini hanya menyediakan Compose PostgreSQL lokal; deployment penuh dan DB belum diimplementasikan.

## Daftar isi

1. [01. Environments](01-environments.md)
2. [02. Infrastructure](02-infrastructure.md)
3. [03. Initial Deployment](03-initial-deployment.md)
4. [04. Release Updates](04-release-updates.md)
5. [05. Rollback](05-rollback.md)
6. [06. Database Reset](06-database-reset.md)
7. [07. Database Debugging](07-database-debugging.md)

## Companion Documents

| Dokumen | Hubungan |
| --- | --- |
| [../technical-specs/11-environment-configuration.md](../technical-specs/11-environment-configuration.md) | Variabel lingkungan |
| [../technical-specs/06-data-model.md](../technical-specs/06-data-model.md) | Skema database |
| [../technical-specs/15-scheduler-and-notifications.md](../technical-specs/15-scheduler-and-notifications.md) | Job harian dan advisory lock |
| [../api-specs/07-system.md](../api-specs/07-system.md) | Endpoint reset-state dan health |
