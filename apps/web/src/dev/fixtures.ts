import type { BookDetail, Genre, Popup } from '../api/contracts';

// Data ini hanya dimuat oleh mode development "demo"; bukan akun atau buku produksi.
export const DEMO_PASSWORD = 'ReadOnly123!';
export const DEMO_MEMBER = 'member@demo.readonly.test';
export const DEMO_ADMIN = 'admin@demo.readonly.test';
export const demoGenres: Genre[] = [
  'Fiksi',
  'Self-Improvement',
  'Desain',
  'Keuangan',
  'Perjalanan',
  'Bahasa Jepang',
].map((name, index) => ({ id: `genre-${index + 1}`, name }));
const titles = [
  ['Langit Setelah Hujan', 'Rani Kusuma', 'langit', 0],
  ['Surat untuk Laut', 'Adit Pranata', 'surat', 0],
  ['Rumah di Ujung Jalan', 'Sinta Wening', 'rumah', 0],
  ['Di Antara Musim', 'Dara Kinasih', 'musim', 0],
  ['Pelabuhan Terakhir', 'Bima Aksara', 'pelabuhan', 0],
  ['Cahaya di Balik Jendela', 'Maya Lestari', 'cahaya', 0],
  ['Jelajah Nusantara', 'Aditya Mahendra', 'jelajah', 4],
  ['Prinsip Desain Visual', 'Dimas Pradana', 'desain', 2],
  ['Cerdas Kelola Uang', 'Arga Wicaksana', 'uang', 3],
  ['Investasi untuk Pemula', 'Nadia Pramesti', 'investasi', 3],
  ['Bahasa Jepang Dasar', 'Rina Tanaka', 'jepang', 5],
  ['Langkah ke Kyoto', 'Maya Lestari', 'kyoto', 4],
] as const;
export const demoBooks: BookDetail[] = titles.map(
  ([title, author, cover, genreIndex], index) => ({
    id: `book-${index + 1}`,
    title,
    author,
    publisher: 'Pustaka Cerita',
    publication_year: 2024,
    synopsis: `${title} mengajak pembaca menjelajahi gagasan dan cerita dari sudut pandang baru. Lewat tulisan ${author}, setiap halaman menghadirkan ruang untuk memahami pengalaman, menemukan inspirasi, dan melihat hal-hal sederhana dengan lebih dekat.`,
    cover_url: `/demo/covers/${cover}.webp`,
    genres: [
      {
        id: `genre-${genreIndex + 1}`,
        name: demoGenres[genreIndex]?.name ?? 'Fiksi',
        status: 'active',
      },
    ],
    available_count: [2, 4, 10].includes(index) ? 0 : 3,
    is_available: ![2, 4, 10].includes(index),
    availability_label: [2, 4, 10].includes(index)
      ? 'Tidak Tersedia'
      : 'Tersedia',
    average_rating: index % 3 === 0 ? 4.5 : 3.8,
  }),
);

export function makeDemoPopups(today: Date): Popup[] {
  const date = (offset: number) => {
    const wibDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(today);
    const day = new Date(`${wibDate}T12:00:00+07:00`);
    day.setUTCDate(day.getUTCDate() + offset);
    return day.toISOString().slice(0, 10);
  };
  return [
    {
      condition: 'OVERDUE',
      books: [
        {
          loan_id: 'loan-1',
          book_title: 'Langit Setelah Hujan',
          due_date: date(-4),
          late_days: 4,
          message:
            'Langit Setelah Hujan terlambat 4 hari. Segera ajukan pengembalian.',
        },
        {
          loan_id: 'loan-2',
          book_title: 'Surat untuk Laut',
          due_date: date(-2),
          late_days: 2,
          message:
            'Surat untuk Laut terlambat 2 hari. Segera ajukan pengembalian.',
        },
      ],
    },
    {
      condition: 'DUE_TODAY',
      books: [
        {
          loan_id: 'loan-3',
          book_title: 'Pelabuhan Terakhir',
          due_date: date(0),
          message:
            'Pelabuhan Terakhir jatuh tempo hari ini. Silakan dikembalikan.',
        },
      ],
    },
    {
      condition: 'DUE_SOON',
      books: [
        {
          loan_id: 'loan-4',
          book_title: 'Cahaya di Balik Jendela',
          due_date: date(3),
          remaining_days: 3,
          message: 'Batas pengembalian 3 hari lagi',
        },
      ],
    },
  ];
}
