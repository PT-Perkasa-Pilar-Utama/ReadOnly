**Version:** 0.1  
**Date:** 2026-11-05  
**Author:** Tech Lead  
**Status:** Draft  
**Phase:** Deployment Plan  

# Database Debugging - ReadOnly

Panduan target inspeksi database saat job, stok, atau denda tidak sesuai harapan. Schema dan adapter DB belum tersedia; gunakan perintah setelah kartu DB selesai. Jangan dijalankan sebagai reset production.

## 1. Masuk ke PostgreSQL

```bash
docker compose -f docker/compose.yml exec db psql -U readonly -d readonly_prod
```

Staging: ganti nama database menjadi `readonly_staging`. Development: `readonly_dev`.

## 2. Cek kesehatan migrasi

```sql
SELECT * FROM drizzle.__drizzle_migrations ORDER BY created_at DESC LIMIT 10;
```

Jika tabel migrasi kosong setelah rilis, API mungkin terhubung ke instance yang salah. Bandingkan `DATABASE_URL` (tanpa mencetak password ke log, SEC-14, SEC-15).

## 3. Cek stok vs pinjaman aktif (AC-08.03, AC-09.03, spek 13)

```sql
SELECT b.id, b.title, b.available_count,
       (SELECT COUNT(*) FROM loans l
         WHERE l.book_id = b.id
           AND l.status IN ('BORROWED','OVERDUE','RETURN_PENDING','FINE_PENDING')
       ) AS active_loans
FROM books b
WHERE b.deleted_at IS NULL;
```

Invariant: `available_count + active_loans` tidak boleh melebihi stok fisik judul itu. `available_count >= 0` (CHECK). Jika pecah, hentikan API dan telusuri `loan_events` (SEC-10).

## 4. Cek job terlambat (AC-06.03, Q-31)

```sql
SELECT id, status, due_date, late_days, return_requested_at, confirmed_at
FROM loans
WHERE status = 'BORROWED'
  AND due_date < (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Jakarta')::date;
```

Baris di sini setelah 00:05 WIB menandakan job tidak jalan atau advisory lock tertahan.

```sql
SELECT locktype, objid, granted, pid
FROM pg_locks
WHERE locktype = 'advisory';
```

Jika lock tertahan oleh proses mati, restart container API (lock sesi hilang). Catch-up di boot harus mengosongkan query di atas.

## 5. Cek denda (AC-09.04, AC-09.08)

```sql
SELECT id, status, late_days, fine_amount, fine_status, fine_paid_at, fine_paid_by
FROM loans
WHERE late_days > 0;
```

Harapan (konstanta hanya di spek 12, bukan env):

- `late_days` 1 sampai 4: `fine_amount = 2000` setelah Admin menekan pembayaran denda.
- `late_days >= 5`: `fine_amount` dari input Admin, 1..99.999.999.
- `late_days` dibekukan bila `return_requested_at` bukan null (Q-24).

## 6. Cek notifikasi (AC-10.01 sampai AC-10.03)

```sql
SELECT loan_id, type, created_at
FROM notifications
ORDER BY created_at DESC
LIMIT 50;
```

Unique `(loan_id, type)` harus menahan duplikat DUE_SOON_3D / DUE_TODAY / OVERDUE.

## 7. Cek token QR (SEC-12)

```sql
SELECT id, status, qr_token_hash IS NOT NULL AS has_token
FROM loans
WHERE status = 'PENDING';
```

Jangan `SELECT` kolom token mentah. Token plaintext tidak disimpan. Jangan tulis hash ke log aplikasi.

## 8. Yang dilarang

- `TRUNCATE` / `DROP SCHEMA` di production.
- Memanggil reset-state (route tidak terdaftar).
- Mengubah `status` langsung dengan `UPDATE` di luar `LoanService.transition` kecuali insiden yang sudah disetujui TL, lalu catat di `loan_events`.
- Mencetak `SESS_SECRET`, password, atau PII alamat/ponsel ke tiket (SEC-15).

## Cross-References

- [04-release-updates.md](04-release-updates.md)
- [06-database-reset.md](06-database-reset.md)
- [../technical-specs/06-data-model.md](../technical-specs/06-data-model.md)
- [../technical-specs/13-stock-integrity-and-concurrency.md](../technical-specs/13-stock-integrity-and-concurrency.md)
- [../technical-specs/15-scheduler-and-notifications.md](../technical-specs/15-scheduler-and-notifications.md)
