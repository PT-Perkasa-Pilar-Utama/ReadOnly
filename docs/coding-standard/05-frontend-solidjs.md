**Version:** 0.1  
**Date:** 2026-11-05  
**Author:** Tech Lead  
**Status:** Draft  
**Phase:** Coding Standard  

# Frontend SolidJS - ReadOnly

## 5.1 Struktur halaman

Satu folder per halaman di `apps/web/src/pages/` sesuai spek 03: Login, RegisterStep1, PilihGenre, Home, BookDetail, Loans, Dashboard, MasterBooks, MasterGenres, ManagementUsers, LoanManagement.

## 5.2 Data

- Semua fetch lewat klien API di `apps/web/src/api/`. Tidak ada `fetch` langsung di komponen.
- Klien memetakan `code` error ke pesan inline. Pesan ditampilkan persis string AC, bukan diparafrase.
- TanStack Query untuk cache daftar dan detail. Invalidasi setelah mutasi pinjam, kembali, dan Master Buku.

## 5.3 Guard

- Router guard membaca `GET /auth/me`. Member yang membuka rute Admin ditolak (AC-02.05, kartu FE-S1-05).
- Email `newmember@gmail.com` ditampilkan di pojok kanan atas sesuai AC-02.01; asumsi Q-06 telah digantikan oleh grooming final.

## 5.4 Kamera dan QR

- Scanner hanya dipasang di halaman Dashboard Admin (AC-08.03).
- Akses kamera hanya pada secure context (HTTPS). `localhost` dikecualikan (SEC-17, Q-01).
- Pustaka QR generator dan scanner: `<pin at scaffold>`. Token QR tidak ditulis ke `console` atau analytics (SEC-12).

## 5.5 Pustaka UI

Pustaka komponen belum diputus `[ASSUMED Q-33]`. Jangan menambah dependency UI sebelum Q-33 ditutup. Sampai itu, markup dan CSS lokal di halaman.

## Cross-References

- [../technical-specs/14-qr-borrow-confirmation.md](../technical-specs/14-qr-borrow-confirmation.md)
- [../decisions/2026-11-05-figma-sync.md](../decisions/2026-11-05-figma-sync.md)
