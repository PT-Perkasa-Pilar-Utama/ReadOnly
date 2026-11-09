**Version:** 0.1
**Date:** 2026-11-05
**Author:** Tech Lead
**Status:** Draft
**Phase:** Task Breakdown

# Team and Process - ReadOnly

> **Rujukan kapasitas aktif:** rundown PM memakai satu sprint dan kapasitas `5 hari kerja × 5,5 jam efektif × jumlah developer`. Rincian di bagian kapasitas/review berikut adalah estimasi historis untuk 3 sprint dan 50 AC, bukan komitmen atau kapasitas sprint aktif. Jumlah developer untuk perhitungan PM belum ditetapkan. Lihat [timeline PM](../decisions/2026-11-08-pm-sprint-timeline.md).

## 1. Engineer Composition

| Role | Fokus | Tanggung jawab dominan |
| --- | --- | --- |
| TL | Review akhir, scaffold, DB | Kartu scaffold (TL-S1-01), kartu DB, reviewer akhir semua PR |
| BE1 | Backend | Kartu BE: auth, books, loans, jobs, notifications, dashboard |
| FE1 | Frontend | Kartu FE: semua halaman + komponen + wiring |

- PIC per kartu tercantum pada kolom Owner di [task breakdown terpadu](sprint-1.md); dokumen teknis lain menggunakan peran (P-07).
- Kartu scaffold dan DB dipegang TL.
- Kartu wiring BE diselesaikan BE terakhir.

## 2. Work Model

- Cabang pendek: `<type>/<CARD-ID>-<deskripsi>` → regex `feat/BE-S1-02-auth-login`.
- Contract-first: kontrak API didiskusikan sebelum implementasi kartu.
- Satu kartu = satu PR. Estimasi 0.5 sampai 2.5 dev-day pada kartu lama adalah historis; PM memakai story point dan konversi jam saat Sprint Planning.
- Semua PR direview TL dengan metode lead-review (tiga ronde, tabel temuan ID beku, penelusuran THEN-clause, checklist biner).
- Reviewer untuk PR kartu milik TL: **BE1 atau FE1 sesuai area kartu** (`[ASSUMED Q-37]`). Ini risiko: bila FE1 review kartu BE DB, perlu kompetensi BE1 cukup.

## 3. Capacity (historical 3-sprint estimate)

Kapasitas produktif 8 dev-day per engineer per sprint (P-08). Beban FE Sprint 1 8.75 > 8 (109%, kelebihan 0.75). Penyeimbangan: pindahkan harness e2e dari FE ke kartu TL (BE side), skema bersama `packages/shared` ke BE1, wiring BE ke akhir Sprint 1.

| Owner | Sprint 1 | Sprint 2 | Sprint 3 |
| --- | --- | --- | --- |
| TL (scaffold+DB) | 1.5 | 0 | 0 |
| BE1 | 4.5 | 5.0 | 6.0 |
| FE1 | 8.75 | 8.0 | 6.0 |
| **Subtotal** | **14.75** | **13.0** | **12.0** |
| Utilisasi BE1 (÷8) | 56% | 63% | 75% |
| Utilisasi FE1 (÷8) | 109% | 100% | 75% |

Utilisasi terhadap kapasitas 8 hari (angka kartu, bukan seed lama):
- Sprint 1: BE1 4.5/8 = 56%; FE1 8.75/8 = **109%** (kelebihan 0.75 hari). Catatan di kartu FE-S1-01 tentang harness tidak menurunkan estimasi FE.
- Sprint 2: BE1 5.0/8 = 63%; FE1 8.0/8 = 100%.
- Sprint 3: BE1 6.0/8 = 75%; FE1 6.0/8 = 75%.
- Kolom BE di ringkasan tugas memasukkan kartu TL dan DB. Sprint 1 kolom itu = 6.0, bukan hanya BE1.

## 4. Kapasitas Review (historical 3-sprint estimate)

Asumsi: review TL 2.0–2.5 jam/PR; rework developer 1.0–3.0 jam/PR; 3 ronde lead-review. Penyangga developer: 10 - 8 = 2 hari/sprint.

Seed per sprint 12.0–15.0 dev-day ÷ kartu rata-rata 1.25–1.75 hari = 7–12 kartu/sprint → review TL 1.75–3.75 hari/sprint.

| Sprint | PR (cards) | Review TL (jam = PR x 2 sampai 2.5) | Review TL (hari = jam / 8) | Rework dev (jam = PR x 1 sampai 3) | Rework (hari = jam / 8) | Status TL |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 10 | 20 sampai 25 | 2.5 sampai 3.125 | 10 sampai 30 | 1.25 sampai 3.75 | TL kartu 1.5 + review 2.5-3.125 = 4.0-4.625, di bawah 8 |
| 2 | 8 | 16 sampai 20 | 2.0 sampai 2.5 | 8 sampai 24 | 1.0 sampai 3.0 | TL kartu 0 + review 2.0-2.5, di bawah 8 |
| 3 | 10 | 20 sampai 25 | 2.5 sampai 3.125 | 10 sampai 30 | 1.25 sampai 3.75 | TL kartu 0 + review 2.5-3.125, di bawah 8 |

**Kesimpulan jujur:** TL (kartu sendiri 3.0 sprint 1 + review ~2.5–3.1 hari + rework kartu sendiri ~0.5–1.5 hari) ≈ 6.0–7.6 hari di Sprint 1 → mendekati batas 8. Review TL adalah **kapasitas terbatas**; bila PR meluber ke Sprint 2, rework menumpuk. Solusi: kurangi scope kartu wiring, perpanjang sprint bila perlu, atau tambah BE/FE. **Seremoni tidak ada angkanya di sumber: Tidak diketahui.**

## 5. Definition of Done per Card

- AC terpenuhi tanpa regresi (e2e hijau untuk kartu wiring).
- TypeScript strict dan lint bersih (`bun run typecheck`, `bunx biome check .`).
- Tes sesuai jenis kartu (unit untuk service; e2e untuk halaman/wiring).
- Traceability: baris Operation Status Tracker dari `TODO` menjadi `OK` (api-specs/_index.md).
- Commit dan PR sesuai standar (pr-hygiene, PULL_REQUEST_TEMPLATE.md).
- Persetujuan reviewer (lead-review, 3 ronde).
- Tambahan ReadOnly: setiap THEN-clause AC terbukti di kode dan tes; teks UI persis seperti AC; kontrol SEC-NN yang berlaku lulus checklist.
- Quality gate scaffold: `bunx biome check .`, `bun run typecheck`, `bun test`, dan `bun run build:web` untuk perubahan web. `bun run e2e` menunggu kartu wiring.

## 6. Risiko

- **Aktif:** scope dan estimasi satu sprint belum disepakati; 12 US/77 AC belum menjadi sprint commitment.
- **Aktif:** jumlah developer untuk rumus kapasitas PM belum dicantumkan; tanggal finish Development, batas Sprint 1, dan status UAT perlu klarifikasi.
- **Aktif:** Q-32 (NFR) dan Q-33 (status Figma/pustaka UI) masih terbuka.
- **Historis:** FE Sprint 1 109%, kapasitas review TL, dan dependensi tiga sprint berasal dari baseline lama dan tidak dipakai untuk komitmen saat ini.

## Cross-References

- [Task Breakdown terpadu](sprint-1.md)
- [docs/decisions/2026-11-05-requirements-draft.md](../decisions/2026-11-05-requirements-draft.md)
- [docs/technical-specs/05-module-definitions.md](../technical-specs/05-module-definitions.md)
