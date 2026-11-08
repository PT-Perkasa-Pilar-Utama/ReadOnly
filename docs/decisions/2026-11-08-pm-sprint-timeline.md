**Version:** 1.0
**Date:** 2026-11-08
**Author:** Tech Lead
**Status:** Current planning input
**Phase:** Sprint Planning

# PM Sprint Timeline - ReadOnly

Sumber rundown PM: [Timeline Project ReadOnly Apps](https://docs.google.com/spreadsheets/d/1CxAQ4dSnhGlo_TPH2jXt-cP0gpiAJm5i/edit?usp=sharing&ouid=118177982611329947173&rtpof=true&sd=true).

## Keputusan jadwal

Rundown PM memakai **satu Sprint 1**, bukan tiga sprint seperti estimasi engineering lama. Rentang project yang tertulis adalah 11 hari kerja, 6 sampai 20 November 2026. Ini menetapkan cadence/waktu, bukan komitmen bahwa seluruh 12 US dan 77 AC selesai dalam sprint tersebut.

PM menempatkan pemilihan user story, penentuan prioritas, estimasi, sprint goal, dan komitmen scope pada Sprint Planning. Bila kapasitas tidak cukup, bagian yang boleh ditunda disepakati saat planning. Karena itu seluruh baseline 77 AC tetap menjadi backlog sampai scope sprint dipilih.

## Rundown dari spreadsheet

| Aktivitas | Durasi | Tanggal di sheet | Hasil / catatan |
| --- | --- | --- | --- |
| Grooming | 0,5 hari | 06/11/2026 | BA membahas User Story dan AC; QA mengonfirmasi keterujian; PM menjaga pembahasan tetap pada kebutuhan. |
| Technical Discussion | 2 jam | 06/11/2026 | TL dan developer menyepakati pendekatan teknis, kontrak API/data, dependensi, pemecahan task, serta PIC. Estimasi story point belum dibuat di sesi ini. |
| Sprint Planning | 2 jam | 09/11/2026 | PM memfasilitasi pemilihan story berdasarkan prioritas; developer memberi story point; QA memasukkan task pengujian; tim menyepakati sprint goal dan komitmen. |
| Development | 5 hari | Mulai 09/11/2026 | Team Developer mengerjakan task, self-test, membuat PR, code review, deploy ke environment testing; QA menulis test script secara paralel. Kolom Finish di sheet juga tertulis 09/11/2026, sehingga tanggal akhirnya perlu diklarifikasi. |
| SIT / QA Testing | 3 hari | 16/11 sampai 18/11/2026 | QA menjalankan test script, mencatat defect, retest setelah perbaikan, dan menyusun Test Report serta Defect Log. |
| Sprint Review | 2 jam | 19/11/2026 | BA mendemokan hasil kepada stakeholder; keputusan diterima/ditolak dan feedback dicatat. |
| Retrospective | 30 menit | 19/11/2026 | Mad/Sad/Glad dan action item dengan PIC serta target waktu. |
| Sprint 1 Done | milestone | 20/11/2026 | Gate akhir sprint di spreadsheet. |

Status aktivitas pada sheet tercatat `Not Started`; dokumen ini tidak mengasumsikan aktivitas yang tanggalnya sudah lewat telah terlaksana.

## Estimasi dan kapasitas

Konversi baku pada sheet:

| Story Point | Jam |
| --- | ---: |
| 1 | 0,5 |
| 2 | 1 |
| 3 | 2 |
| 5 | 4 |
| 8 | 8 |

Skenario di atas 8 SP wajib dipecah. Kapasitas Development dihitung `5 hari kerja × 5,5 jam efektif per hari × jumlah developer`. Jumlah developer yang dipakai dalam hitungan belum dinyatakan di sheet, jadi total kapasitas dan komitmen story point belum bisa dihitung dari dokumen ini.

## DoR dan DoD yang dicantumkan PM

- Sebelum Sprint Planning: User Story dan AC jelas, prioritas backlog tersedia, task teknis/PIC hasil Technical Discussion tersedia, kapasitas/hari kerja diketahui, dan skenario AC siap diberi story point.
- DoR lain yang tercantum: desain Figma final, akses repository, dan environment development tersedia. Ini adalah kriteria kesiapan, bukan bukti bahwa Figma telah diverifikasi; status sinkronisasi desain tetap mengikuti Q-33 sampai dikonfirmasi.
- DoD: estimasi sah dan sesuai kapasitas, tidak ada skenario di atas 8 SP yang belum dipecah, sprint goal disepakati, task QA masuk backlog, fitur selesai dan lolos review/test, lalu ter-deploy ke environment testing.
- Fase UAT tidak tercantum dalam timeline; spreadsheet menyatakan keputusan UAT masih menunggu.

## Ketidaksesuaian yang perlu diklarifikasi

1. Komentar project menyebut 11 hari kerja dari 06/11 sampai 20/11. Baris Sprint 1 menyebut finish 19/11, sedangkan milestone `Sprint 1 Done` jatuh pada 20/11.
2. Development berdurasi 5 hari tetapi tanggal mulai dan finish sama-sama tertulis 09/11/2026.
3. Jumlah developer untuk menghitung kapasitas tidak dicantumkan.
4. Scope User Story/AC yang akan masuk sprint dan prioritas final belum ditetapkan pada rundown; pemilihannya dijadwalkan saat Sprint Planning.
5. UAT belum masuk ke timeline.

Sampai klarifikasi atau hasil Sprint Planning tersedia, jangan mengubah 77 AC menjadi komitmen satu sprint dan jangan memakai estimasi 3-sprint lama sebagai estimasi baru.
