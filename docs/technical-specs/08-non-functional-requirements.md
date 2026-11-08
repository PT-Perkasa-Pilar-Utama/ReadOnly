**Version:** 0.1
**Date:** 2026-11-05
**Author:** Tech Lead
**Status:** Draft
**Phase:** Technical Specification

# Non-Functional Requirements - ReadOnly

## Sumber NFR

Sheet Business Value bukan milik ReadOnly (HRIS / penilaian kinerja), sehingga **tidak dipakai** (Q-32). Target berikut adalah **target provisional** yang menunggu konfirmasi resmi dari BA.

## Target provisional [ASSUMED Q-32]

| Metrik | Target | Kondisi | Sumber |
| --- | --- | --- | --- |
| p95 endpoint daftar (books/loans/me) | < 300 ms | 10.000 buku | Q-32 |
| Time to interactive halaman daftar | < 2 detik | broadband, 10.000 buku dengan paginasi | Q-32 |
| Availability | 99% | jam kerja (WIB) | Q-32 |
| Volume | 10.000 buku, 1.000 Member, 50.000 peminjaman | kapasitas desain | Q-32 |
| Denda per transaksi | < 10 ms | `calculateFine` murni | desain |

## Penanganan nilai provisional

- Angka di atas harus digantikan NFR resmi BA di `08-non-functional-requirements.md` setelah rapat BA (Q-32).
- Selama belum ada angka resmi, semua tuning query (indexing, pagination) diarahkan ke target ini sebagai acuan, bukan sebagai SLO yang sudah disepakati.

## Skala dan vertikal

- Skala tetap dalam satu node PostgreSQL 16 + satu API Bun (P-16). Skalabilitas horizontal API ditambahkan bila p95 > target setelah peninjauan load test.
- Paginasi server-side 10/halaman (Q-12) memastikan halaman tetap < 2 detik.

## Observability

- Log struktur ke stderr (termasuk level, timestamp UTC, request_id). Alamat/nomor ponsel tidak masuk log (SEC-15).
- `/health` menampilkan status dependensi (DB reachable, storage healthy) tanpa detail rahasia.

## Retensi dan backup

- Backup database harian + volume cover bersama-sama (`books.cover_path` menunjuk berkas di volume cover). Retensi 7 hari (keputusan opsional, [COPY-TBD Q-32]).

## Cross-References

- [01-overview.md](01-overview.md)
- [docs/deployment-plan/02-infrastructure.md](../deployment-plan/02-infrastructure.md)
- [docs/init/product_overview.md](../init/product_overview.md) (Expected Impact, verbatim)

## Open Follow-ups

Q-32 (NFR resmi dari BA).
