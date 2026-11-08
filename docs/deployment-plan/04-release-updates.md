**Version:** 0.1  
**Date:** 2026-11-05  
**Author:** Tech Lead  
**Status:** Draft  
**Phase:** Deployment Plan  

# Release Updates - ReadOnly

Runbook target untuk rilis Staging dan Production. Belum dapat dijalankan sampai kartu deployment menyediakan image/API/Web/Nginx; perintah migrasi menunggu kartu DB.

## 1. Prinsip rilis

- Satu rilis = satu git SHA yang lulus review dan gate scaffold (`bunx biome check .`, `bun run typecheck`, `bun test`, build web, serta E2E setelah harness tersedia).
- Migrasi database selalu dijalankan **sebelum** container API baru menerima traffic.
- Migrasi bersifat *expand then contract*: kolom baru nullable atau dengan default dulu; penghapusan kolom pada rilis berikutnya.
- Job harian in-process (AC-06.03, AC-10.01 sampai AC-10.03) memakai advisory lock. Restart container tidak boleh menjalankan job dua kali pada jendela yang sama (Q-31).

## 2. Urutan rilis

1. Tag rilis di git (`v0.x.y`) dari SHA yang sudah di-merge ke `main`.
2. Pull SHA tersebut di VPS.
3. Build image baru:

```bash
docker compose -f docker/compose.yml build api web
```

4. Jalankan migrasi terhadap database yang sedang hidup. Perintah menyelesaikan path sendiri:

```bash
docker compose -f docker/compose.yml run --rm api bun run db:migrate
```

5. Recreate API dan web **tanpa** menghapus volume `pgdata` dan `covers`:

```bash
docker compose -f docker/compose.yml up -d --no-deps api web nginx
```

6. Health check:

```bash
curl -fsS https://readonly.example.com/api/v1/health
```

7. Smoke: login Admin, buka Dashboard, buka satu detail buku. Kamera scanner hanya diuji di Staging (HTTPS).

## 3. Scheduler setelah restart

- Job status terlambat dan job notifikasi dijadwalkan 00:05 WIB di dalam proses API.
- Advisory lock (`pg_try_advisory_lock`) mencegah duplikasi jika dua proses API hidup sebentar saat rolling restart.
- Catch-up: jika proses mati melewati 00:05, job berikutnya (atau boot) menjalankan transisi yang tertunda selama `due_date < now` dan `status = BORROWED`. Lihat [15-scheduler-and-notifications](../technical-specs/15-scheduler-and-notifications.md).

## 4. Yang tidak boleh terjadi saat rilis Production

- Tidak memanggil `POST /admin/reset-state` (route tidak terdaftar).
- Tidak memanggil `POST /admin/jobs/run`.
- Tidak `docker compose down -v` (volume database dan cover akan hilang).
- Tidak mengubah `ADMIN_PASSWORD` lewat seed ulang. Rotasi password Admin adalah prosedur operasional terpisah (Q-02).

## 5. Jendela rilis

- Disarankan di luar jam operasional perpustakaan (setelah 17:00 WIB atau sebelum 08:00 WIB).
- Durasi target: di bawah 10 menit (build cache + migrate + recreate). [ASSUMED Q-32]

## Cross-References

- [03-initial-deployment.md](03-initial-deployment.md)
- [05-rollback.md](05-rollback.md)
- [../technical-specs/15-scheduler-and-notifications.md](../technical-specs/15-scheduler-and-notifications.md)
- [../task-breakdown/team-and-process.md](../task-breakdown/team-and-process.md)
