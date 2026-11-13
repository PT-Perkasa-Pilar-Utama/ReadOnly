**Version:** 1.0
**Date:** 2026-11-13
**Author:** Tech Lead
**Status:** Approved technical decision
**Phase:** Technical Specification & UI/UX Baseline

# Penetapan Implementasi QR Code dan Scanner (Keputusan Q-18) - ReadOnly

Dokumen ini memformalkan penetapan pustaka, alur UX pemindaian, dan standarisasi penanganan error untuk implementasi QR Code peminjaman buku (US-08, AC-08.02, AC-08.03, AC-08.06) guna menutup status `Open Follow-up (Q-18)` pada fondasi sistem.

---

## 1. Penetapan Pustaka (Library Selection)

Untuk menjaga performa monorepo Bun + SolidJS tetap ringan tanpa beban build berlebih, ditetapkan:

| Fungsi | Pustaka Terpilih | Penempatan Workspace | Alasan Pemilihan |
| --- | --- | --- | --- |
| **QR Generator (Member)** | `qrcode` (v1.5.x) & `@types/qrcode` | `apps/web` | Ringan, matang, tanpa dependensi framework. Mendukung render langsung ke `<canvas>` maupun SVG string yang ramah SolidJS. |
| **QR Scanner (Admin)** | `html5-qrcode` (v2.3.x) | `apps/web` | Kompatibilitas tinggi dengan webcam browser (laptop/HP), otomatis menangani pemilihan kamera, mirror mode, dan callback stream yang stabil. |

---

## 2. Alur UX Pemindaian Dua Langkah (AC-08.03 & Q-18)

Pemindaian QR oleh Admin Perpus wajib mengikuti alur dua langkah untuk mencegah ketidaksengajaan konfirmasi buku:

```
[Member: Tampilkan QR di Pinjaman Saya] 
       │
       ▼
[Admin: Klik "Scan QR" di Dashboard]
       │
       ▼
[Modal "Scan QR Code" Aktif] ──(Kamera membaca QR valid)──┐
       │                                                   │
       │ (QR tidak valid/sudah dipakai)                    ▼
       ▼                                         [Scanner Berhenti / Tutup]
[Pesan Error: "QR Code tidak valid"]                       │
                                                           ▼
                                                 [Modal "Konfirmasi Peminjaman"]
                                                 - Detail Peminjam
                                                 - Detail Buku
                                                 - Durasi: 7 Hari
                                                           │
                                                           ▼
                                                 [Admin Klik "Konfirmasi Peminjaman"]
                                                           │
                                                           ▼
                                                 [API: Kurangi Stok & Ubah Status]
```

1. **Langkah 1 (Scan Kamera):** Kamera membaca payload token dari QR.
2. **Langkah 2 (Pratinjau & Konfirmasi):** 
   - Begitu QR terbaca dan tervalidasi oleh API, modal scanner otomatis ditutup.
   - Sistem menampilkan pop-up **"Konfirmasi Peminjaman"** yang berisi:
     - **Detail Peminjam:** Nama Peminjam, Tanggal Permintaan, Durasi Peminjaman (7 hari).
     - **Detail Buku:** Cover, Judul Buku, Penulis, Penerbit, Tahun Terbit, Genre.
   - Tindakan pemotongan stok (`available_count`) dan perubahan status ke `Sedang Dipinjam` **hanya dieksekusi** ketika Admin menekan tombol konfirmasi pada modal ini.

---

## 3. Spesifikasi UI Modal & State Handling

### A. Modal QR Member (`apps/web/src/pages/MyLoans`)
1. **Header Item:** Menampilkan Cover, Judul, Penulis, dan status badge `Pending Peminjaman`.
2. **Visual QR:** Canvas/SVG QR beresolusi jelas dengan padding putih yang cukup untuk keterbacaan pemindai.
3. **Kerahasiaan Token & Kode Manual:** Token QR acak 128-bit **tidak boleh ditampilkan sebagai teks**; kode konfirmasi manual satu kali (`PJM-XXXXXX`, disimpan sebagai SHA-256 hash di `manual_code_hash`) ditampilkan di bawah `No. Pinjaman: ...` sebagai fallback apabila pemindai kamera Admin bermasalah.
4. **Helper Copy:** *"Tunjukkan kode QR ini kepada Admin untuk konfirmasi peminjaman, atau sebutkan kode konfirmasi manual jika pemindai tidak tersedia."*

### B. Modal Scanner Admin (`apps/web/src/pages/Dashboard`)
1. **Viewfinder:** Area kamera berbingkai persegi dengan sudut reticle (*corner brackets*) dan garis pemindai horizontal (*scan line*).
2. **State Kamera Izin Ditolak (*Permission Denied*):**
   Jika pengguna/browser menolak akses kamera, tampilkan pesan informatif:
   > *"Akses kamera tidak diizinkan. Silakan aktifkan izin kamera pada browser Anda untuk memindai QR Code."*
3. **State QR Tidak Valid (AC-08.06):**
   Jika QR tidak dikenali, salah format, atau sudah pernah dipakai:
   * Tampilkan pesan error berwarna merah di atas kotak kamera: **`"QR Code tidak valid. Silakan scan ulang."`** (Ejaan baku bahasa Indonesia: *silakan*, selaras dengan pesan dasar AC-08.06 `"QR Code tidak valid"`).
   * Scanner tetap aktif agar Admin dapat langsung mengarahkan QR kembali tanpa harus membuka ulang modal.
4. **Jalur Cadangan Manual (Fallback UX):**
   Untuk mengantisipasi kendala hardware kamera (webcam rusak/buram), sediakan tautan atau tombol alternatif di bawah kotak kamera:
   > *"Kamera bermasalah? Masukkan kode peminjaman secara manual"*
   yang memungkinkan Admin menginput kode peminjaman langsung.

---

## 4. Keamanan & Kebijakan Data (Q-18)

- **One-Time Token & Manual OTP:** Token QR dan kode konfirmasi manual bersifat sekali pakai dan ikut dirotasi saat `GET /loans/:id/qr` dipanggil. Setelah Admin menekan "Konfirmasi Peminjaman", kedua hash di-invalidate di server (`qr_token_hash = NULL`, `manual_code_hash = NULL`, dan `qr_consumed_at` diisi).
- **No Log Leak:** String `qr_token` tidak boleh ditulis ke dalam log sistem maupun konsol browser (SEC-10).

---

## 5. Status Dokumen Terkait

- Menutup follow-up `Q-18` pada `docs/technical-specs/04-tech-stack.md` dan `docs/technical-specs/14-qr-borrow-confirmation.md`.
- Kartu frontend Sprint 2 (`FE-S2-*`) yang mengerjakan US-08 mengacu pada keputusan ini sebagai spesifikasi implementasi.
