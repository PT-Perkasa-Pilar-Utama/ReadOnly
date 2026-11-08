**Version:** 0.1
**Date:** 2026-11-05
**Author:** Tech Lead
**Status:** Draft
**Phase:** Technical Specification

# Stock Integrity and Concurrency - ReadOnly

Model stok, invarian, dan pola balapan (Q-09, Q-15, Q-18).

## Desain it twice: model stok (Q-09)

### Opsi A: `available_count` (DIPILIH)

- Satu kolom `books.available_count` integer, CHECK `>= 0`, diubah atomik bersama status peminjaman.
- Admin menetapkan nilai baru lewat Edit (AC-05.05).
- **Kelebihan:** satu query UPDATE atomic; invarian langsung terlihat; cocok untuk skala Q-32 tanpa join.
- **Kekurangan:** drift potensial bila ada perbaikan manual ke stok; perlu reconciliation job berkala (tidak ada di v1).

### Opsi B: `total_stock` + ketersediaan turunan

- `total_stock` (total fisik) dan `borrowed_count`; ketersediaan = `total_stock - borrowed_count`.
- **Kelebihan:** riwayat stok fisik terdokumentasi.
- **Kekurangan:** perlu query agregat atau kolom turunan; risiko drift antara stok fisik dan peminjaman tercatat; lebih kompleks di transaksi.

**Keputusan:** Opsi A (`available_count`). Opsi B di-backlog bila BA meminta pelacakan stok fisik terpisah.

## Invarian

- `books.available_count >= 0` (CHECK).
- `available_count` = jumlah buku yang bukan soft-deleted dan bukan dipinjam aktif? **Tidak** - stok tidak diresevasikan saat Pending (Q-15), jadi `available_count` mencerminkan buku yang **bukan dipinjam aktif ("Sedang Dipinjam", "Terlambat", "Pending Pengembalian", "Pending Keterlambatan")**. Karena itu update stok harus sejalan dengan status, dalam satu transaksi.
- **Batas transaksi:** perubahan status, perubahan stok, `loan_events`, dan notifikasi terjadi dalam satu transaksi.

## Skenario balapan dan jawaban

| Skenario | Jawaban |
| --- | --- |
| Dua Admin mengonfirmasi QR yang sama | Token sekali pakai: Admin pertama mengonsumsi token; Admin kedua mendapat "QR Code tidak valid" (AC-08.06). |
| Dua Member merebut stok terakhir (Q-15) | Kedua ajukan pinjam → keduanya dapat PENDING. Konfirmasi QR pakai `UPDATE ... SET available_count = available_count - 1 WHERE id = ? AND available_count > 0`. Bila 0 rows → abort, status tetap PENDING, 409. |
| Konfirmasi pengembalian ganda | Transaction guard: UPDATE loans SET status='RETURNED' WHERE id=? AND status='RETURN_PENDING'; 0 rows → InvalidStateTransitionError (422). |
| Admin mengedit stok saat transaksi pinjam berjalan | PostgreSQL row-level lock: UPDATE dengan WHERE id=... AND available_count>0; bila drift, row di-update atomic, notifikasi reconciliation opsional. |
| Hapus buku melawan PENDING (Q-11) | Guard DELETE/soft-delete: tolak bila ada loan WHERE book_id=? AND status <> 'RETURNED'. Pengecekan + penghapusan satu transaksi. |

## Kode HTTP

- Stok habis saat konfirmasi: **HTTP 409** (Conflict), pesan: `[COPY-TBD Q-15]`.
- Transisi tidak sah / konfirmasi ganda: **HTTP 422** (`invalid_state_transition`).
- QR invalid / token terpakai: **HTTP 404** atau 422 tergantung desain error; di API 04 ditentukan.

## Pattern update bersyarat

```ts
export async function confirmLoanTx(loanId: string): Promise<number> {
  return db.transaction(async (tx) => {
    const row = await tx
      .update(books)
      .set({ availableCount: sql`${books.availableCount} - 1` })
      .where(eq(books.id, bookId))
      .returning()
      .where(gt(books.availableCount, 0)); // conditional decrement
    if (row.length === 0) throw new StockUnavailableError('409');
    await tx.update(loans).set({ status: 'BORROWED', confirmedAt: now() }).where(eq(loans.id, loanId));
    await tx.insert(loan_events).values({ from: 'PENDING', to: 'BORROWED', actorId: adminId });
    return row.length;
  });
}
```

## Cross-References

- [12-loan-lifecycle-and-fines.md](12-loan-lifecycle-and-fines.md)
- [api-specs/04-loans.md](../api-specs/04-loans.md)
- [coding-standard/06-konkurensi-dan-transaksi.md](../coding-standard/06-konkurensi-dan-transaksi.md)

## Open Follow-ups

Q-15 (pesan 409), Q-16 (ekspiring PENDING mengurangi drift).
