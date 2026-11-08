**Version:** 0.2
**Date:** 2026-11-09
**Author:** Tech Lead
**Status:** Diselaraskan untuk baseline 12 US / 77 AC
**Phase:** Task Breakdown

# Task Breakdown - ReadOnly

> **Status:** Rundown PM menetapkan satu sprint ([rundown PM](../decisions/2026-11-08-pm-sprint-timeline.md)). Seluruh **12 US dan 77 AC** dari [grooming final](../decisions/2026-11-06-grooming-final.md) serta [AC addendum](../business/acceptance-criteria-addendum.md) kini telah dipetakan ke kartu kerja di bawah ini agar tim memiliki acuan cabang/PR yang lengkap. Pilihan kartu yang masuk komitmen Sprint Planning tetap mengikuti kapasitas tim; angka `Est` (`Xd`) pada tabel merupakan estimasi bobot relatif per kartu.

Cara membaca: setiap kartu = satu branch = satu PR (P-19). ID kartu berformat `[BE|FE|TL|DB]-S<kelompok>-<NN>`. Kartu TL dan DB berada di tabel Backend.

- [Team and process](team-and-process.md)
- [Sprint 1 (Kelompok 1): Fondasi, Autentikasi, Master Buku, Master Genre, & Management User](sprint-1.md)
- [Sprint 2 (Kelompok 2): Katalog Member, Peminjaman QR, & Dashboard Admin](sprint-2.md)
- [Sprint 3 (Kelompok 3): Manajemen Peminjaman, Pengembalian/Denda, & Reminder/Popup](sprint-3.md)

## Ringkasan Kartu (Baseline Penuh 12 US / 77 AC)

| Kelompok | Fokus | BE cards | FE cards | BE Est | FE Est |
| --- | --- | --- | --- | --- | --- |
| 1 | Fondasi, Autentikasi, Master Buku, Master Genre (US-11), Management User (US-12) | 7 | 7 | 8.5 | 11.25 |
| 2 | Katalog Member, Peminjaman dengan QR, dan Dashboard Admin | 4 | 4 | 5.0 | 8.0 |
| 3 | Manajemen Peminjaman, Pengembalian & Denda, serta Reminder & Popup Login | 5 | 5 | 6.5 | 6.5 |
| **Total** | **12 US / 77 AC** | **16** | **16** | **20.0** | **25.75** |

## Updating

- Saat kartu selesai diimplementasikan, perbarui baris Operation Status Tracker di [docs/api-specs/07-system.md](../api-specs/07-system.md) (`TODO` -> `OK`).

## AC coverage rules

- Seluruh **77 AC** (`AC-01.01` s/d `AC-12.11`) telah dipetakan ke minimal satu kartu di `sprint-1.md`, `sprint-2.md`, dan `sprint-3.md`.
- AC murni UI -> kartu FE.
- AC job (`AC-06.03`) -> kartu BE.
- Kartu Member dan Admin Perpus dipisah sesuai aktor (Q-35).
