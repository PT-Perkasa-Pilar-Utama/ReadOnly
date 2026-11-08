**Version:** 1.0
**Date:** 2026-11-08
**Author:** Tech Lead
**Status:** One-sprint planning baseline
**Phase:** Business

# Sprint Breakdown - ReadOnly

> **Jadwal aktif:** rundown PM memakai satu Sprint 1. Rentang project 06/11 sampai 20/11/2026. Ini adalah cadence, bukan komitmen menyelesaikan seluruh baseline 12 US/77 AC. Scope dan prioritas dipilih pada Sprint Planning berdasarkan kapasitas dan estimasi developer. Lihat [catatan timeline PM](../decisions/2026-11-08-pm-sprint-timeline.md).

## Sprint 1: ReadOnly Apps

- **Rentang project di spreadsheet:** 11 hari kerja, 06/11/2026 sampai 20/11/2026.
- **Tanggal baris Sprint 1:** 06/11/2026 sampai 19/11/2026; milestone `Sprint 1 Done` tercatat 20/11/2026. Klarifikasi tanggal akhir masih diperlukan.
- **Sprint goal:** disepakati saat Sprint Planning, setelah backlog diprioritaskan dan kapasitas dihitung. Belum ditetapkan di rundown PM.
- **Scope:** dipilih dari backlog 12 US/77 AC di Sprint Planning. Spreadsheet tidak menetapkan daftar story/AC yang committed; jangan mengasumsikan semua 77 AC masuk.

### Rundown

| Aktivitas | Durasi | Jadwal |
| --- | --- | --- |
| Grooming | 0,5 hari | 06/11/2026 |
| Technical Discussion | 2 jam | 06/11/2026 |
| Sprint Planning | 2 jam | 09/11/2026 |
| Development | 5 hari | Mulai 09/11/2026; tanggal Finish pada sheet juga 09/11 dan perlu diklarifikasi |
| SIT / QA Testing | 3 hari | 16/11 sampai 18/11/2026 |
| Sprint Review | 2 jam | 19/11/2026 |
| Retrospective | 30 menit | 19/11/2026 |
| Sprint 1 Done | milestone | 20/11/2026 |

### Estimasi dan kapasitas

Sprint Planning menetapkan story point per skenario/AC setelah developer membagi task dan PIC pada Technical Discussion. Konversi yang digunakan PM:

| Story Point | Jam |
| --- | ---: |
| 1 | 0,5 |
| 2 | 1 |
| 3 | 2 |
| 5 | 4 |
| 8 | 8 |

Skenario di atas 8 SP wajib dipecah. Kapasitas Development adalah `5 hari kerja × 5,5 jam efektif × jumlah developer`. Jumlah developer belum ditentukan dalam spreadsheet, sehingga total kapasitas dan komitmen sprint masih menunggu Sprint Planning.

### Kriteria kesiapan dan penutupan

- **DoR:** User Story/AC jelas, prioritas tersedia, technical tasks dan PIC hasil Technical Discussion ada, skenario siap diestimasi, kapasitas diketahui, serta Figma final, repository, dan environment development tersedia.
- **DoD:** estimasi sesuai kapasitas, tidak ada skenario >8 SP yang belum dipecah, sprint goal dan QA tasks disepakati, fitur lulus review/test, ter-deploy ke environment testing, dan Sprint Review/Retrospective tercatat.
- UAT belum tercantum pada timeline dan masih menunggu keputusan.

## Batas dokumen lama

File AC breakdown Sprint 1–3 dan task cards Sprint 1–3 adalah artefak alokasi/estimasi engineering lama untuk 50 AC. File tersebut dipertahankan sebagai referensi historis dan traceability, bukan jadwal aktif atau komitmen scope. Lihat [indeks AC](acceptance-criteria.md), [task breakdown lama](../task-breakdown/_index.md), dan [catatan timeline PM](../decisions/2026-11-08-pm-sprint-timeline.md).
