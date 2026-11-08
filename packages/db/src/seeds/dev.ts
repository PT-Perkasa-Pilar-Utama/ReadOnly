import type { Database } from '../client';
import { bookGenres, books, genres, userGenres, users } from '../schema';
import {
  clearAllTables,
  hashPassword,
  QA_IDS,
  type SeedCounts,
  type SeedOptions,
} from './shared';

export async function seedDev(
  db: Database,
  options: SeedOptions = {},
): Promise<SeedCounts> {
  const now = options.clock?.now() ?? new Date();
  const adminEmail =
    options.adminEmail ?? process.env.ADMIN_EMAIL ?? 'admin@readonly.local';
  const adminPassword =
    options.adminPassword ?? process.env.ADMIN_PASSWORD ?? 'devadmin123!';
  const cost =
    options.bcryptRounds ?? Number(process.env.BCRYPT_SALT_ROUNDS ?? 10);

  const [adminPasswordHash, memberPasswordHash] = await Promise.all([
    hashPassword(adminPassword, cost),
    hashPassword('password', cost),
  ]);

  await clearAllTables(db);

  const insertedUsers = await db
    .insert(users)
    .values([
      {
        id: QA_IDS.users.admin,
        fullName: 'Admin Perpus',
        email: adminEmail,
        passwordHash: adminPasswordHash,
        address: null,
        phoneNumber: '081100000001',
        role: 'admin',
        status: 'active',
        createdAt: now,
      },
      {
        id: QA_IDS.users.member1,
        fullName: 'Member Satu',
        email: 'newmember@gmail.com',
        passwordHash: memberPasswordHash,
        address: 'Jl. Sudirman No. 1, Jakarta',
        phoneNumber: '081200000001',
        role: 'member',
        status: 'active',
        createdAt: now,
      },
    ])
    .returning();

  const insertedGenres = await db
    .insert(genres)
    .values([
      {
        id: QA_IDS.genres.fiksi,
        name: 'Fiksi',
        status: 'active',
        createdAt: now,
      },
      {
        id: QA_IDS.genres.teknologi,
        name: 'Teknologi',
        status: 'active',
        createdAt: now,
      },
      {
        id: QA_IDS.genres.sejarah,
        name: 'Sejarah',
        status: 'active',
        createdAt: now,
      },
      {
        id: QA_IDS.genres.bisnis,
        name: 'Bisnis',
        status: 'active',
        createdAt: now,
      },
      {
        id: QA_IDS.genres.sains,
        name: 'Sains',
        status: 'active',
        createdAt: now,
      },
    ])
    .returning();

  await db.insert(userGenres).values([
    { userId: QA_IDS.users.member1, genreId: QA_IDS.genres.fiksi },
    { userId: QA_IDS.users.member1, genreId: QA_IDS.genres.teknologi },
  ]);

  const insertedBooks = await db
    .insert(books)
    .values([
      {
        id: QA_IDS.books.bookA,
        title: 'Bumi Manusia',
        author: 'Pramoedya Ananta Toer',
        publisher: 'Lentera Dipantara',
        publicationYear: 1980,
        synopsis:
          'Roman sejarah perjuangan Minke pada masa kolonial Hindia Belanda.',
        availableCount: 3,
        coverPath: null,
        createdAt: now,
      },
      {
        id: QA_IDS.books.bookB,
        title: 'Clean Architecture',
        author: 'Robert C. Martin',
        publisher: 'Prentice Hall',
        publicationYear: 2017,
        synopsis:
          'Panduan merancang struktur perangkat lunak yang mudah dipelihara.',
        availableCount: 2,
        coverPath: null,
        createdAt: now,
      },
      {
        id: QA_IDS.books.bookC,
        title: 'Filosofi Teras',
        author: 'Henry Manampiring',
        publisher: 'Kompas',
        publicationYear: 2018,
        synopsis:
          'Penerapan filsafat Stoa untuk ketenangan mental sehari-hari.',
        availableCount: 4,
        coverPath: null,
        createdAt: now,
      },
      {
        id: QA_IDS.books.bookD,
        title: 'Sapiens: Riwayat Singkat Umat Manusia',
        author: 'Yuval Noah Harari',
        publisher: 'KPG',
        publicationYear: 2014,
        synopsis: 'Perjalanan sejarah evolusi dan peradaban manusia.',
        availableCount: 1,
        coverPath: null,
        createdAt: now,
      },
    ])
    .returning();

  await db.insert(bookGenres).values([
    { bookId: QA_IDS.books.bookA, genreId: QA_IDS.genres.fiksi },
    { bookId: QA_IDS.books.bookA, genreId: QA_IDS.genres.sejarah },
    { bookId: QA_IDS.books.bookB, genreId: QA_IDS.genres.teknologi },
    { bookId: QA_IDS.books.bookC, genreId: QA_IDS.genres.bisnis },
    { bookId: QA_IDS.books.bookD, genreId: QA_IDS.genres.sejarah },
    { bookId: QA_IDS.books.bookD, genreId: QA_IDS.genres.sains },
  ]);

  return {
    users: insertedUsers.length,
    genres: insertedGenres.length,
    books: insertedBooks.length,
    loans: 0,
    notifications: 0,
    ratings: 0,
  };
}
