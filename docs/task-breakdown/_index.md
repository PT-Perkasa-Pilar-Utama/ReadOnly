**Version:** 0.3
**Date:** 2026-11-09
**Author:** Tech Lead
**Status:** Baseline 12 US / 77 AC, dikonsolidasikan dalam satu file
**Phase:** Task Breakdown

# Task Breakdown - ReadOnly

> Rundown PM menetapkan satu sprint ([rundown PM](../decisions/2026-11-08-pm-sprint-timeline.md)). Task cards baseline kini dikonsolidasikan ke satu file, [`sprint-1.md`](sprint-1.md), dalam tiga kelompok alokasi historis. Seluruh 12 US dan 77 AC dipetakan ke kartu agar tim memiliki acuan teknis dan traceability. Kartu yang masuk komitmen sprint tetap dipilih saat Sprint Planning berdasarkan kapasitas; estimasi pada tabel adalah bobot relatif per kartu, bukan komitmen jadwal.

Cara membaca: setiap kartu = satu branch = satu PR (P-19). ID kartu dipertahankan sesuai kelompok asal: `[BE|FE|TL|DB]-S<kelompok>-<NN>`. Prefix `S2` dan `S3` pada ID lama tidak menetapkan Sprint 2 atau Sprint 3 pada rundown PM.

- [Team and process](team-and-process.md)
- [Sprint 1: Task Breakdown terpadu (kelompok historis 1–3)](sprint-1.md)
- [Task breakdown lengkap (Excel)](task-breakdown.xlsx)
- [Huly sub-issue drafts (Markdown)](huly-sub-issues.md)
- [Huly sub-issue drafts (Excel)](huly-sub-issues.xlsx)

## Ringkasan Kartu (Baseline Penuh 12 US / 77 AC)

| Kelompok alokasi historis | Fokus | BE cards | FE cards | BE Est | FE Est |
| --- | --- | --- | --- | --- | --- |
| 1 | Fondasi, Autentikasi, Master Buku, Master Genre (US-11), Management User (US-12) | 7 | 7 | 8.5 | 11.25 |
| 2 | Katalog Member, Peminjaman dengan QR, dan Dashboard Admin | 4 | 4 | 5.0 | 8.0 |
| 3 | Manajemen Peminjaman, Pengembalian & Denda, serta Reminder & Popup Login | 5 | 5 | 6.5 | 6.5 |
| **Total** | **12 US / 77 AC** | **16** | **16** | **20.0** | **25.75** |

## Updating

- Saat kartu selesai diimplementasikan, perbarui baris Operation Status Tracker di [docs/api-specs/07-system.md](../api-specs/07-system.md) (`TODO` -> `OK`).

## AC coverage rules

- Seluruh **77 AC** (`AC-01.01` s/d `AC-12.11`) dipetakan ke minimal satu kartu pada tiga kelompok di `sprint-1.md`.
- AC murni UI -> kartu FE.
- AC job (`AC-06.03`) -> kartu BE.
- Kartu Member dan Admin Perpus dipisah sesuai aktor (Q-35).
