**Version:** 0.1
**Date:** 2026-11-05
**Author:** Tech Lead
**Status:** Draft
**Phase:** Technical Specification

# QR Borrow Confirmation - ReadOnly

Desain token QR dan alur scan (Q-18).

## Desain token (Q-18): design it twice

**Opsi A - server render (API mengirim gambar/Base64):**
- Member GET `/loans/:id/qr` → API return gambar QR (atau Base64) yang memuat token.
- **Kelebihan:** token tidak pernah diekspos ke klien; gambar di-cache server-side.
- **Kekurangan:** satu endpoint tambahan, bandwidth gambar, caching header.

**Opsi B - klien render (klien mendapat string token, generate QR lokal):**
- Member GET `/loans/:id/qr` → API return `{ token: string }`; klien generate QR lokal.
- **Kelebihan:** tidak ada render server, ringan, mudah diuji.
- **Kekurangan:** token diekspos ke memori klien (risiko rendah: token sekali pakai, hash di DB).

**Keputusan: Opsi B.** Token diekspos ke klien karena sekali pakai dan terikat satu peminjaman; hash disimpan di `loans.qr_token_hash`. QR generator di `apps/web` (pustaka `<pin at scaffold>`, Q-18).

## Spesifikasi token

- Entropi: minimal 128 bit acak kriptografis (crypto.getRandomValues).
- Penyimpanan: SHA-256 hash di `loans.qr_token_hash`; token plaintext hanya di memori sesi request.
- Sekali pakai: konsumsi menghapus hash / menandai `qr_consumed_at`.
- Keterikatan: satu token = satu peminjaman.

## Alur scan dua langkah

1. Admin tekan "Scan QR" (Dashboard, AC-08.03) → pop up scanner.
2. Scanner hasilkan pratinjau detail (nama peminjam, judul buku, tanggal permintaan, durasi 7 hari) → pop up "Konfirmasi Peminjaman" (AC-08.03).
3. Admin tekan "Konfirmasi Peminjaman" → konsumsi token → update status/stok.

## Kasus tidak valid (AC-08.06)

| Kasus | Respon | Perubahan status/stok |
| --- | --- | --- |
| Token tak dikenal (hash tidak ada) | "QR Code tidak valid" | tidak ada |
| Token sudah dipakai | "QR Code tidak valid" | tidak ada |
| Peminjaman bukan PENDING | "QR Code tidak valid" | tidak ada |

## Izin kamera dan HTTPS

- Kamera browser hanya jalan di Secure Context (HTTPS). Development `localhost` dikecualikan (Q-01). Izin kamera diminta saat pop up scanner dibuka.

## Rate limit scan QR

- Rate limit per IP (env `QR_RATE_LIMIT_WINDOW_MIN`, SEC-06) pada endpoint preview QR.

## Token tidak boleh masuk log

- SEC-10: `qr_token` tidak pernah di-log. Hanya log hash/loan_id di context operasional.

## Strategi uji e2e (design it twice)

**Opsi A - kamera palsu Chromium:** Playwright membuka tab dengan media stream fake (berkas video berisi frame QR) lalu klik "Scan".
- **Kelebihan:** uji jalur kamera nyata.
- **Kekurangan:** rumit, fragile.

**Opsi B - injeksi token (non-prod):** tombol rahasia "inject test token" pada halaman scan hanya aktif di `APP_ENV !== production`; klik → langsung set token valid → lanjutkan alur.
- **Kelebihan:** deterministik, cepat, menutup jalur sukses.
- **Kekurangan:** tidak uji pustaka scanner.

**Keputusan:** Opsi B sebagai jalur utama e2e (dipisah feature flag non-prod); Opsi A sebagai bonus bila waktu memungkinkan. Jalur injeksi terdaftar bersyarat seperti `reset-state`.

## Kedaluwarsa

Tanpa kedaluwarsa token pada v1 (terikat Q-16: tidak ada pembatalan/ekspirasi PENDING). Jika BA menambah kedaluwarsa 24 jam, tambahkan `qr_token_expires_at` + job pembersihan.

## Cross-References

- [13-stock-integrity-and-concurrency.md](13-stock-integrity-and-concurrency.md)
- [15-scheduler-and-notifications.md](15-scheduler-and-notifications.md)
- [api-specs/04-loans.md](../api-specs/04-loans.md)
- [docs/business/acceptance-criteria-breakdown/acceptance-criteria-sprint-2.md](../business/acceptance-criteria-breakdown/acceptance-criteria-sprint-2.md)

## Open Follow-ups

Q-01 (kedaluwarsa token jika BA mengubah), Q-15 (pesan 409), Q-33 (pustaka scanner).
