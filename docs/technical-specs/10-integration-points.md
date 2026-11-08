**Version:** 0.1
**Date:** 2026-11-05
**Author:** Tech Lead
**Status:** Draft
**Phase:** Technical Specification

# Integration Points - ReadOnly

## Sistem eksternal

Tidak ada sistem eksternal pada v1. Semua integrasi bersifat internal (P-06, Q-03).

## Seam internal

### Storage port (Q-13)

Interface yang didefinisikan di `apps/api/src/ports/storage.ts`:

```ts
export interface StoragePort {
  // Upload cover buku; return path relatif terhadap root storage
  uploadCover(fileName: string, body: Buffer): Promise<string>;
  // Present cover ke browser; menolak path yang tidak aman
  getCoverUrl(relativePath: string): string;
  // Detach cover saat transaksi gagal atau buku di-soft-delete
  detachCover(relativePath: string): Promise<void>;
}
```

- **Adapter disk lokal** (`DiskStorageAdapter`): menulis ke volume Docker `cover` dengan nama file acak.
- **Adapter uji** (`MemoryStorageAdapter`): menyimpan buffer di memori; digunakan oleh tes unit/integrasi.
- Penyajian berkas: route static `/covers/:relativePath` (API) atau proxy Nginx (production).
- Pembersihan: berkas yatim dihapus bila transaksi gagal; saat buku di-soft-delete, cover tetap ada (riwayat) kecuali ada pemadaman manual.

### Clock port (Q-31)

Interface yang didefinisikan di `apps/api/src/ports/clock.ts`:

```ts
export interface ClockPort {
  now(): Date;        // waktu "sekarang" untuk seluruh domain
  utcNow(): Date;     // untuk penulisan timestamp ke DB
}
```

- Implementasi default: `Date.now()` + zona waktu.
- Clock disuntikkan ke job harian dan fungsi denda, sehingga tes dapat menginjak waktu tanpa jam sistem (coding-standard/08-tests.md).

### API kamera browser

- Web mengakses kamera via `navigator.mediaDevices.getUserMedia({ video: true })` dalam Secure Context (HTTPS; `localhost` dikecualikan dev).
- Pustaka scanner QR (P-18: `<pin at scaffold>`) membaca stream video dan mendeteksi kode QR.
- Jalur cadangan input manual kode PIN belum diputus; butuh persetujuan BA dan akan ditandai `[COPY-TBD Q-18]` (Open Follow-up).

## Bagian yang tidak berlaku

- Email gateway, push notification service, WebSocket server, payment gateway, SSO/OIDC, CRM/HRIS sync: **Not applicable: out of scope v1 (Q-03, Q-29).**
- Transcoding gambar: **Not applicable: cover hanya divalidasi, bukan ditranscoding (Q-13).**
- Pelacakan eksemplar per barcode: **Not applicable: stok bersifat judul, bukan eksemplar (Q-09).**

## Cross-References

- [17-cover-upload-and-storage.md](17-cover-upload-and-storage.md)
- [15-scheduler-and-notifications.md](15-scheduler-and-notifications.md)
- [14-qr-borrow-confirmation.md](14-qr-borrow-confirmation.md)
- [docs/deployment-plan/01-environments.md](../deployment-plan/01-environments.md) (HTTPS staging/production)

## Open Follow-ups

Q-13 (pustaka/adapter Storage final), Q-18 (implementasi render QR), Q-29 (notifikasi).
