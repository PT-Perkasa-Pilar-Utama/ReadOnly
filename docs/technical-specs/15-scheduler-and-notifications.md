**Version:** 0.1
**Date:** 2026-11-05
**Author:** Tech Lead
**Status:** Draft
**Phase:** Technical Specification

# Scheduler and Notifications - ReadOnly

Bandeng minimal dua opsi penjadwal, lalu memilih satu (P-14, Q-31).

## Perbandingan opsi penjadwal

| Opsi | Deskripsi | Kelebihan | Kekurangan |
| --- | --- | --- | --- |
| A - in-process + advisory lock | Job berjalan di proses API, dikunci PostgreSQL advisory lock, idempoten | Tanpa dependensi eksternal; satu proses; catch-up saat start mudah | Mengikat satu thread API; load job bersaing dengan request |
| B - worker terpisah (Bun proses) | Proses worker terpisah menjalankan job, polling advisory lock | Tidak mengikat thread API | Satu proses tambahan; sinkronisasi clock worker vs API |
| C - cron OS / systemd timer | Cron menjalakan `bun run job:status` | Standar OS, mudah monitor | Membutuhkan akses OS; lebih banyak komponen; tricky timezone |

**Keputusan: Opsi A (in-process + advisory lock)** - P-14. Tidak ada dependensi eksternal; idempotensi terjamin advisory lock + constraint unik; catch-up natural saat API start.

## Jadwal dan zona waktu

- Job berjalan 00:05 **Asia/Jakarta** setiap hari.
- Job A (`status_overdue`): ubah status BORROWED → OVERDUE bila `due_date < now WIB`.
- Job B (`notifications`): buat notifikasi DUE_SOON_3D / DUE_TODAY / OVERDUE.

## Idempotensi

- Advisory lock PostgreSQL (`SELECT pg_advisory_xact_lock(hashtext('loan_overdue_job'))`).
- Constraint unik `notifications(loan_id, type)` mencegah duplikat bila job berjalan lebih dari satu kali.
- Tabel `job_runs` mencatat `started_at/finished_at/rows_affected`.
- Catch-up: saat API start, job dijalankan sekali untuk menutup peminjaman yang terlewat saat server mati.

## Urutan langkah job

```
1. pg_advisory_xact_lock('loan_overdue_job')
2. for loan in loans WHERE status='BORROWED' AND due_date < now:
     update loans set status='OVERDUE', late_days=datediff(due_date, now)
     insert loan_events
3. for loan in loans WHERE status='BORROWED' AND due_date = now+3:
     insert notifications type=DUE_SOON_3D
4. insert notifications type=DUE_TODAY where due_date=now (unique constraint)
5. insert notifications type=OVERDUE where status='OVERDUE' AND not yet notified (unique per loan,type)
6. update job_runs
7. unlock (end of transaction)
```

## Penanganan gagal

- Transaction rollback total bila ada error; retry eksponensial sebelum mencatat `job_runs.finished_at` error.
- Log ke stderr (tanpa PII, SEC-15).

## Observabilitas

`job_runs` (1 row per run) + log. Endpoint QA non-prod: `POST /admin/jobs/run?job=status_overdue` menjalankan job sekarang.

## Model data notifikasi

| Field | Type | Notes |
| --- | --- | --- |
| id | uuid | PK |
| loan_id | uuid | FK, UNIQUE bersama type |
| type | text | DUE_SOON_3D / DUE_TODAY / OVERDUE |
| text | text | template verbatim (lihat bawah) |
| is_read | boolean | false; follow-up Q-29 |
| created_at | timestamptz | UTC |

## Tiga tipe dan pemicu (Q-30)

| Tipe | Pemicu | Status saat pemicu | Trigger scope |
| --- | --- | --- | --- |
| DUE_SOON_3D | 3 hari sebelum batas | BORROWED | sekali per pinjaman |
| DUE_TODAY | pada tanggal batas | BORROWED | sekali |
| OVERDUE | saat status → OVERDUE | OVERDUE | sekali |

Unik per (loan_id, type) → constraint unik (idempotensi).

## Template notifikasi daftar verbatim (AC-10.01–AC-10.03)

- DUE_SOON_3D: "Batas pengembalian 3 hari lagi" + keterangan "{judul_buku} perlu dikembalikan paling lambat {tanggal_batas_pengembalian}." (AC-10.02)
- DUE_TODAY: "{judul_buku} sudah mencapai tenggat waktu peminjaman. Silahkan Dikembalikan" (AC-10.01)
- OVERDUE: "Buku melewati batas pengembalian" + keterangan "{judul_buku} jatuh tempo pada {tanggal_batas_pengembalian}. Segera ajukan pengembalian." (AC-10.03)

Format `{tanggal_batas_pengembalian}`: default `d MMMM yyyy` bahasa Indonesia ([COPY-TBD Q-36]).

## Daftar dan popup login

- GET `/notifications`: daftar member, terbaru dulu; notifikasi tetap tersimpan walau popup ditutup (AC-10.08).
- Pada setiap login Member dan setelah diarahkan ke Home, UI memakai data reminder yang ada untuk menampilkan popup: 1–3 hari lagi, jatuh tempo hari ini, dan terlambat. Untuk due-soon, hitung sisa hari dari `due_date` pada zona waktu WIB; gabungkan judul yang memiliki kondisi sama.
- Bila ada beberapa kondisi, urutan popup adalah terlambat, jatuh tempo hari ini, lalu 1–3 hari lagi. Setiap popup tampil 3 detik; tombol X menutup popup sekarang dan melanjutkan popup berikutnya (AC-10.04–AC-10.08).
- Copy popup mengikuti addendum secara verbatim: `Batas pengembalian {sisa_hari} hari lagi` beserta judul dan tanggal batas; `{judul_buku} jatuh tempo hari ini. Silakan dikembalikan.`; `{judul_buku} terlambat {jumlah_hari} hari. Segera ajukan pengembalian.`
- Popup tidak menambah tipe notifikasi atau endpoint baru. Perilaku badge unread dan aksi tandai dibaca belum ditentukan; jangan menyimpulkan notifikasi dihapus saat popup ditutup.

## Retensi

AC-10.08 menetapkan bahwa menutup popup tidak menghapus reminder dari daftar notifikasi. Retensi setelah itu belum ditetapkan.

## Cross-References

- [12-loan-lifecycle-and-fines.md](12-loan-lifecycle-and-fines.md)
- [10-integration-points.md](10-integration-points.md) (Clock port)
- [api-specs/05-notifications.md](../api-specs/05-notifications.md)
- [deploy 04](../deployment-plan/04-release-updates.md), [deploy 07](../deployment-plan/07-database-debugging.md)

## Open Follow-ups

Q-29 (badge unread/read), Q-36 (format tanggal). Popup login/urutan/penutupan dari AC-10.04–AC-10.08 adalah kebutuhan aktif, bukan follow-up.
