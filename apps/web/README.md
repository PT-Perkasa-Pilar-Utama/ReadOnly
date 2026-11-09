# Frontend ReadOnly

Implementasi FE untuk US-01, US-02, US-03, US-07, US-10, dan US-12. Menggunakan SolidJS, TanStack Solid Router/Query, TypeScript strict, dan CSS lokal. Komentar `AC-...` menghubungkan perilaku kode dengan Acceptance Criteria.

## Menjalankan

Dari root repo:

```powershell
bun install --frozen-lockfile
bun run dev:web:demo
```

Buka http://127.0.0.1:5173. Banner **Mode demo** menandai data simulasi. Tombol pada Login mengisi akun demo, lalu tekan **Login**.

| Akun demo | Email | Password |
| --- | --- | --- |
| Member dengan reminder dan pinjaman aktif | member@demo.readonly.test | ReadOnly123! |
| Admin | admin@demo.readonly.test | ReadOnly123! |
| Member nonaktif | nonaktif@demo.readonly.test | ReadOnly123! |

Data demo terisolasi di `src/dev/`, tersimpan pada sessionStorage tab browser, dan bukan pengganti autentikasi backend. Password dari form tidak dipersistenkan dalam bentuk teks. Tab baru memulai data uji terpisah. Gunakan data fiktif saja. Popup mengikuti tanggal WIB ketika demo dijalankan.

Untuk API asli, hentikan demo dan jalankan:

```powershell
bun run dev
```

Perintah tersebut menjalankan API dan web bersamaan. Untuk terminal terpisah, gunakan `bun run dev:api` dan `bun run dev:web`.

Vite meneruskan `/api` ke `http://127.0.0.1:3000`. API bisnis di checkout awal belum tersedia. Mode biasa menampilkan kegagalan koneksi/API yang sebenarnya; tidak beralih otomatis ke data demo. Build produksi selalu menggunakan API asli, bahkan jika dibuild dengan `--mode demo`.

## Peta implementasi

| Cakupan | Lokasi |
| --- | --- |
| Shell, guard, sesi, API client | `src/routes.tsx`, `src/lib/session.ts`, `src/api/` |
| AC-01.01–AC-01.08 | `src/pages/RegisterStep1/`, `src/pages/PilihGenre/` |
| AC-02.01–AC-02.05, AC-03.01 | `src/pages/Login/`, `src/components/AppLayout.tsx` |
| AC-07.01–AC-07.04 | `src/pages/Home/`, `src/pages/BookDetail/` |
| AC-10.01–AC-10.07 | `src/components/Notifications.tsx` |
| AC-12.01–AC-12.11 | `src/pages/ManagementUsers/`, `src/api/users.ts` |

PDF BA menamai tutup popup sebagai AC-10.07. Repo menamainya AC-10.08 dan memakai AC-10.07 untuk urutan kondisi. Keduanya dilayani: popup terurut OVERDUE, DUE_TODAY, DUE_SOON; setiap kondisi berisi semua judul terkait dan tampil 3 detik; X mempercepat perpindahan tanpa menghapus notifikasi. Penanda sekali per login hanya menyimpan ID user, bukan token sesi.

Dashboard menyediakan tujuan redirect Admin dan tautan Management User. Metrik US-04, halaman Pinjaman, dan aksi Pinjam US-08 menunggu pekerjaan FE lainnya. Tombol Pinjam ditampilkan tetapi dinonaktifkan dengan keterangan. Backend tetap bertanggung jawab atas sesi HttpOnly, izin akses, scheduler, penyimpanan data, dan guard bisnis; guard FE tidak menggantikannya.

## Pemeriksaan

```powershell
bun run typecheck
bun test
bun run build:web
bun run check
```

`bun run check` tetap mencakup gate Biome. Windows Application Control pada lingkungan pengembangan ini memblokir executable Biome dan shim executable paket. Script TypeScript/Vite memanggil entry JavaScript langsung melalui Bun agar bisa dijalankan di Windows ini. Jika Biome diblokir pada mesin Anda, jalankan gate di lingkungan yang mengizinkannya; jangan menonaktifkan kebijakan keamanan.

Ilustrasi login dan cover demo dipotong dari PNG desain ZIP yang disediakan. Referensi ini tidak menyertakan layar Management User, sehingga halaman tersebut memakai komponen tabel/form yang sama dan field sesuai BA. Font Cormorant Garamond dan Raleway disimpan lokal, dengan lisensi OFL di `public/fonts/`.
