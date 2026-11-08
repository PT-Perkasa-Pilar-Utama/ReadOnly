**Version:** 0.1  
**Date:** 2026-11-05  
**Author:** Tech Lead  
**Status:** Draft  
**Phase:** Onboarding  

# Welcome

ReadOnly adalah aplikasi peminjaman buku internal PT. Perkasa Pilar Utama. Repo ini memiliki scaffold minimal dari kartu `TL-S1-01`: API health, shell web kosong, workspace, dan quality gates. Fitur bisnis serta implementasi DB menunggu kartu terkait.

Persona: Admin Perpus dan Member. Baseline grooming terbaru memuat 12 user story dan 77 acceptance criteria ([indeks](../business/acceptance-criteria.md)). Rundown PM memakai satu sprint; scope dipilih saat Sprint Planning dan tidak otomatis mencakup seluruh baseline ([rundown](../business/sprint-breakdown.md)).

Masalah yang diselesaikan: pencatatan manual, stok yang tidak real-time, dan tidak ada pengingat batas pinjam.

## Yang harus diingat hari pertama

- Teks UI dan pesan error persis AC, termasuk ejaan BA.
- Konstanta bisnis hanya di spek 12 dan nanti di `packages/shared/constants.ts`.
- Figma **belum diverifikasi**. AC adalah sumber copy.
- Sheet Business Value berisi HRIS dan **tidak dipakai** (Q-32).

## Cross-References

- [../init/product_overview.md](../init/product_overview.md)
- [../GLOSSARY.md](../GLOSSARY.md)
