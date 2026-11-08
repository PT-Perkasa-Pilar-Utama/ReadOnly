**Version:** 0.1  
**Date:** 2026-11-05  
**Author:** Tech Lead  
**Status:** Draft  
**Phase:** Onboarding  

# Domain Walkthrough

Baca [GLOSSARY](../GLOSSARY.md) lalu spek 12.

Alur Member: daftar dua langkah, login, Home, Detail, Pinjam, tampilkan QR, kembalikan dengan rating.

Alur Admin: login ke Dashboard, Scan QR, Master Buku, Manajemen Peminjaman, pembayaran denda, konfirmasi pengembalian.

Job 00:05 WIB: BORROWED menjadi OVERDUE; notifikasi DUE_SOON_3D, DUE_TODAY, OVERDUE.

Stok berkurang pada konfirmasi QR, bukan pada pengajuan.

## Cross-References

- [../technical-specs/12-loan-lifecycle-and-fines.md](../technical-specs/12-loan-lifecycle-and-fines.md)
- [../technical-specs/14-qr-borrow-confirmation.md](../technical-specs/14-qr-borrow-confirmation.md)
