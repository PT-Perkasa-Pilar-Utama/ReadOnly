**Version:** 0.1  
**Date:** 2026-11-05  
**Author:** Tech Lead  
**Status:** Draft  
**Phase:** Deployment Plan  

# Rollback - ReadOnly

Runbook target mengembalikan Staging atau Production ke SHA rilis sebelumnya. Belum dapat dijalankan sebelum image dan service deployment tersedia.

## 1. Kapan rollback

- Health check gagal setelah rilis (`db: error` atau API tidak merespons).
- Regresi fungsional yang memblokir alur utama (login, pinjam, konfirmasi QR, pengembalian).
- Migrasi gagal di tengah jalan (lihat bagian 3).

## 2. Rollback aplikasi (tanpa migrasi mundur)

Jika rilis baru **tidak** menambah migrasi, atau migrasi bersifat kompatibel mundur (kolom baru nullable):

1. Checkout SHA rilis sebelumnya di VPS.
2. Build dan recreate `api` + `web` dari image SHA itu.
3. Jangan sentuh volume `pgdata` dan `covers`.
4. Health check ulang.

Perintah target berikut baru dapat dijalankan setelah Dockerfile dan service deployment disediakan oleh kartu deployment.

```bash
git fetch --tags
git checkout <previous-tag>
docker compose -f docker/compose.yml build api web
docker compose -f docker/compose.yml up -d --no-deps api web nginx
curl -fsS https://readonly.example.com/api/v1/health
```

## 3. Rollback dengan migrasi

Drizzle migrate di ReadOnly **tidak** memakai `down` otomatis pada rilis. Kebijakan:

1. Setiap migrasi harus *expand*: kolom baru boleh ada, kolom lama tidak dihapus pada rilis yang sama.
2. Jika rilis baru gagal setelah migrate, aplikasi lama harus tetap bisa berjalan terhadap skema baru (kolom ekstra diabaikan).
3. Penghapusan kolom / tabel hanya pada rilis terpisah setelah semua instance API sudah di SHA yang tidak membaca kolom itu.

Jika migrasi merusak data (bukan hanya skema):

1. Hentikan API (`docker compose stop api`).
2. Pulihkan dump `pg_dump` terbaru dari [02-infrastructure.md](02-infrastructure.md) bagian Backup.
3. Recreate API pada SHA sebelumnya.
4. Laporkan insiden; jangan jalankan seed atau reset-state di production.

## 4. Yang dilarang saat rollback Production

- **`POST /admin/reset-state` tidak terdaftar** di production. Jangan mengandalkannya untuk "membersihkan" data rusak.
- Jangan `docker compose down -v`.
- Jangan seed ulang Admin jika baris Admin sudah ada; seed bersifat idempoten hanya untuk baris yang belum ada.

## 5. Keputusan rollback vs hotfix

- Regresi kecil pada satu endpoint: hotfix ke depan lebih disukai daripada rollback jika migrasi sudah expand.
- Kegagalan login, stok, atau QR: rollback aplikasi dulu, hotfix kemudian.

## Cross-References

- [04-release-updates.md](04-release-updates.md)
- [06-database-reset.md](06-database-reset.md)
- [07-database-debugging.md](07-database-debugging.md)
- [../technical-specs/06-data-model.md](../technical-specs/06-data-model.md)
