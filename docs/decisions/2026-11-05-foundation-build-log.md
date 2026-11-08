**Version:** 0.1  
**Date:** 2026-11-05  
**Author:** Tech Lead  
**Status:** Complete  
**Phase:** Build Log  

# Foundation Build Log - ReadOnly

Catatan audit historis pada 2026-11-05 sebelum scaffold dibuat. Saat catatan ini ditulis, repositori ReadOnly belum memuat kode aplikasi, build config, CI runner, atau Dockerfile fisik. Status terkini berubah setelah kartu `TL-S1-01`; lihat README dan panduan development.

## 1. Status Workspace dan Sumber

| Parameter | Status | Catatan |
| --- | --- | --- |
| Tanggal sistem | 2026-11-05 | Zona Asia/Jakarta |
| Akses file system | Ya | Ditulis langsung ke direktori `readonly/` |
| Akses shell | Ya (PowerShell) | Python 3.11 stdlib; tanpa modul eksternal pip/openpyxl |
| Akses Figma | Gagal (404 / unsupported) | Status dokumen: `belum diverifikasi` (Q-33) |
| Sumber data | Google Sheet CSV export | Sheet Product Overview, User Story, Acceptance Criteria |
| Sheet Business Value | Diabaikan | Konten milik HRIS/kinerja karyawan (Q-32) |
| Arsip skill template | Tidak ada | Skrip bantu ditandai **tidak dijalankan**; verifikasi manual |
| Perintah proyek | Belum tersedia pada tanggal audit | Scaffold monorepo dibangun kemudian pada kartu TL-S1-01; lihat panduan terkini |

## 2. Ringkasan Eksekusi Fase 0 s/d 10

| Fase | Folder / File Utama | Hasil | Status Gate |
| --- | --- | --- | --- |
| 0 | Skeleton direktori | Struktur direktori repositori lengkap | Manual |
| 1 | `docs/init/` (4 file) | 10 US, 50 AC verbatim, dump ac_raw | Manual (C-01) |
| 2 | `docs/decisions/` (3 file) | Requirements draft, Grooming (Q-01..Q-37), Figma sync | Manual |
| 3 | `docs/business/` (4 file + 3 breakdown) | User story, sprint breakdown, AC index 50 AC (23/11/16) | Manual (C-01) |
| 4 | `docs/technical-specs/` (18 file) | Spek 01 s/d 17 + index; konstanta di spek 12 | Manual (C-04) |
| 5 | `docs/api-specs/` (8 file) | Spek 01 s/d 07 + index; 28 operasi berstatus `TODO` | Manual (C-07) |
| 6 | `docs/task-breakdown/` (5 file) | Team & process, sprint 1-3; 14 BE + 14 FE kartu | Manual (C-02, C-03) |
| 7 | `docs/deployment-plan/` (8 file) | 01 s/d 07 + index; reset prod dilarang keras, seed QA | Manual (C-08) |
| 8 | `docs/coding-standard/` (12 file), `docs/code-review-checklist/` (8 file) | 11 standar + index, 7 checklist + index; 1:1 SEC-NN | Manual (C-05, C-10, C-14) |
| 9 | `docs/development-guide/` (10 file), `docs/onboarding/` (8 file), `GLOSSARY.md`, `README.md`, `CLAUDE.md`, `AGENTS.md`, `.github/` (4 file) | Orientasi dan template GitHub | Manual (C-09, C-12) |
| 10 | `docs/decisions/2026-11-05-foundation-build-log.md` | Audit C-01 s/d C-16, penghapusan ledger sementara | **LULUS (Audit Python)** |

## 3. Matriks Hasil Verifikasi Kriteria C-01 s/d C-16

Audit otomatis dijalankan menggunakan skrip Python stdlib (`audit_c.py`):

| Kriteria | Target Verifikasi | Hasil Audit | Status |
| --- | --- | --- | --- |
| **C-01** | 50 AC tepat, sebaran Sprint 1: 23, Sprint 2: 11, Sprint 3: 16; teks verbatim | S1: 23 AC, S2: 11 AC, S3: 16 AC. Total: 50 AC unik. Indeks memuat 50 AC yang identik tanpa selisih. | **LULUS** |
| **C-02** | Task breakdown summary match: BE 14 kartu (17.0d), FE 14 kartu (22.75d) | BE 14 kartu = 17.0 dev-day; FE 14 kartu = 22.75 dev-day. Total 28 kartu = 39.75 dev-day. | **LULUS** |
| **C-03** | Cakupan AC pada kartu: 50 dari 50 AC terpetakan ke minimal satu kartu | Seluruh 50 AC unik tercakup pada kartu task-breakdown. Nol AC tertinggal, nol AC fiktif. | **LULUS** |
| **C-04** | Spek teknis 01 s/d 17 + index lengkap; konstanta bisnis di spek 12 / shared | 17 file spek + index. Konstanta (7 hari, 3 hari, Rp 2.000, ambang 1-4 dan 5, 5 MiB) terisolasi di spek 12. | **LULUS** |
| **C-05** | Kontrol keamanan SEC-01 s/d SEC-17 berpasangan 1:1 di checklist | 17 kontrol SEC unik di spek 07 berpasangan tepat 1:1 dengan item di checklist 04-security. | **LULUS** |
| **C-06** | Model tim: kapasitas 8d, TL PR direview BE1/FE1 (Q-37), FE S1 109% risiko | Terdefinisi di `team-and-process.md`; perhitungan kapasitas mencerminkan utilisasi aktual. | **LULUS** |
| **C-07** | Kontrak API 01 s/d 07 + index; 28 operasi berstatus `TODO` | 28 operasi terdaftar pada tracker; seluruh baris bertanda `TODO` sebelum kartu implementasi. | **LULUS** |
| **C-08** | Deployment plan: HTTPS kamera, reset prod dilarang (404), seed QA 6 status | Matriks seed QA mencakup 6 status dan denda bound 0, 1, 4, 5, 6; aritmetika Dashboard diverifikasi. | **LULUS** |
| **C-09** | Tidak ada kontaminasi domain/identitas luar | Verifikasi string audit: nol penyebutan template luar pada konten dokumen aplikasi. | **LULUS** |
| **C-10** | Coding standard 01 s/d 11 + index lengkap | 11 dokumen standar + index. | **LULUS** |
| **C-11** | Style linting: nol em-dash, nol plain TBD/FIXME, tag ber-ID kanonik | Audit regex: 0 em-dash, 0 plain TBD/FIXME. 17 tag `[ASSUMED Q-NN]`, 25 tag `[COPY-TBD Q-NN]`. | **LULUS** |
| **C-12** | Documentation Map di README lengkap dan akurat; status Figma belum diverifikasi | Seluruh dokumen tertaut di README; baris status Figma berstatus `belum diverifikasi`. | **LULUS** |
| **C-13** | Struktur target repositori Bun workspaces terdokumentasi tanpa kode fisik | Pohon arsitektur target terdokumentasi di spek 03; repositori fisik murni dokumen. | **LULUS** |
| **C-14** | Aturan higiene PR terpusat tunggal | Satu blok fence format PR/commit di `coding-standard/11-pr-hygiene.md`; checklist hanya menaut. | **LULUS** |
| **C-15** | Format Gherkin valid pada seluruh breakdown AC | Tiga file sprint menggunakan blok gherkin dengan klausa Given-When-Then. | **LULUS** |
| **C-16** | Perintah proyek bertanda `Berlaku setelah TL-S1-01` | Pada tanggal audit, perintah build/test/migrate memang belum dapat dijalankan karena scaffold belum dibangun. Status ini historis dan digantikan scaffold TL-S1-01. | **LULUS** |

## 4. Gerbang Otomatis yang Tidak Dijalankan

Karena arsip dependensi internal dan skrip helper tidak disediakan di workspace, gerbang skrip berikut **tidak dijalankan** dan digantikan oleh audit manual di atas:

1. `.claude/skills/technical-spec/scripts/check_index.py` (pada technical-specs dan api-specs).
2. `build_ac_index.py` (pada business acceptance-criteria).
3. `recompute_summary.py` dan `check_ac_refs.py` (pada task-breakdown).
4. Skrip sinkronisasi `.claude/skills` dan `.agents/skills`.

## 5. Register Keputusan dan Tag Aktif

- **Register Pertanyaan (Q-01 s/d Q-37):** Terdaftar lengkap di `docs/decisions/2026-11-05-grooming-readonly.md`.
- **Tag Asumsi (`[ASSUMED Q-NN]`):** 17 kemunculan (Q-05, Q-06, Q-32, Q-33, Q-34, Q-37).
- **Tag Teks UI Menunggu BA (`[COPY-TBD Q-NN]`):** 25 kemunculan (Q-04, Q-05, Q-08, Q-15, Q-18, Q-21, Q-28, Q-29, Q-32, Q-36).

## 6. Risiko Utama dan Rujukan Grooming

1. **FE Overload Sprint 1:** Kapasitas FE Sprint 1 mencapai 8.75 hari (109% dari kapasitas 8 hari). Mitigasi sementara: penyeimbangan wiring kartu.
2. **Kapasitas Review TL:** Review 28 PR dengan 3 ronde lead-review memerlukan 6.5 s/d 8.75 hari kerja TL di Sprint 1.
3. **Figma Belum Diverifikasi:** Desain UI berpotensi memiliki perbedaan komponen saat link Figma dapat diakses kembali.
4. **Pertanyaan Prioritas BA:** 10 pertanyaan utama tercatat di [docs/decisions/2026-11-05-grooming-readonly.md#6-prioritas-untuk-rapat-ba-10-pertanyaan](2026-11-05-grooming-readonly.md#6-prioritas-untuk-rapat-ba-10-pertanyaan).
