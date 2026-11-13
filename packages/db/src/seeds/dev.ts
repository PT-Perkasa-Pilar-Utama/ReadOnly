import type { Database } from '../client';
import {
  bookGenres,
  books,
  genres,
  loanEvents,
  loans,
  notifications,
  ratings,
  userGenres,
  users,
} from '../schema';
import {
  addDaysWibDateString,
  clearAllTables,
  formatIndonesianDate,
  hashPassword,
  QA_IDS,
  QA_PENDING_MANUAL_CODE,
  QA_PENDING_QR_TOKEN,
  type SeedCounts,
  type SeedOptions,
  sha256Hex,
} from './shared';

const DEV_EXTRA_USER_ID = '00000000-0000-4000-8000-000000000005';

export async function seedDev(
  db: Database,
  options: SeedOptions = {},
): Promise<SeedCounts> {
  const now = options.clock?.now() ?? new Date();
  const adminEmail =
    options.adminEmail ?? process.env.ADMIN_EMAIL ?? 'admin@readonly.ppu.co.id';
  const adminPassword =
    options.adminPassword ?? process.env.ADMIN_PASSWORD ?? 'password123';
  const cost =
    options.bcryptRounds ?? Number(process.env.BCRYPT_SALT_ROUNDS ?? 10);

  const [adminPasswordHash, memberPasswordHash] = await Promise.all([
    hashPassword(adminPassword, cost),
    hashPassword('password123', cost),
  ]);

  await clearAllTables(db);

  // 1. 5 Users (1 Admin, 3 Active Members, 1 Inactive Member)
  const insertedUsers = await db
    .insert(users)
    .values([
      {
        id: QA_IDS.users.admin,
        fullName: 'Admin Perpus',
        email: adminEmail,
        passwordHash: adminPasswordHash,
        address: 'Jl. Gatot Subroto Kav. 10, Jakarta Selatan',
        phoneNumber: '081100000001',
        role: 'admin',
        status: 'active',
        createdAt: now,
      },
      {
        id: QA_IDS.users.member1,
        fullName: 'Member Satu',
        email: 'member1@readonly.ppu.co.id',
        passwordHash: memberPasswordHash,
        address: 'Jl. Sudirman No. 1, Jakarta Pusat',
        phoneNumber: '081200000001',
        role: 'member',
        status: 'active',
        createdAt: now,
      },
      {
        id: QA_IDS.users.member2,
        fullName: 'Budi Santoso',
        email: 'member2@readonly.ppu.co.id',
        passwordHash: memberPasswordHash,
        address: 'Jl. Thamrin No. 12, Jakarta Pusat',
        phoneNumber: '081200000002',
        role: 'member',
        status: 'active',
        createdAt: now,
      },
      {
        id: DEV_EXTRA_USER_ID,
        fullName: 'Siti Rahmawati',
        email: 'member3@readonly.ppu.co.id',
        passwordHash: memberPasswordHash,
        address: 'Jl. Kuningan Barat No. 8, Jakarta Selatan',
        phoneNumber: '081200000003',
        role: 'member',
        status: 'active',
        createdAt: now,
      },
      {
        id: QA_IDS.users.inactiveMember,
        fullName: 'Andi Pratama (Nonaktif)',
        email: 'inactive@readonly.ppu.co.id',
        passwordHash: memberPasswordHash,
        address: 'Jl. Rasuna Said No. 5, Jakarta Selatan',
        phoneNumber: '081200000004',
        role: 'member',
        status: 'inactive',
        createdAt: now,
      },
    ])
    .returning();

  // 2. 5 Genres (4 Active, 1 Inactive)
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
        status: 'inactive',
        createdAt: now,
      },
    ])
    .returning();

  await db.insert(userGenres).values([
    { userId: QA_IDS.users.member1, genreId: QA_IDS.genres.fiksi },
    { userId: QA_IDS.users.member1, genreId: QA_IDS.genres.teknologi },
    { userId: QA_IDS.users.member2, genreId: QA_IDS.genres.sejarah },
    { userId: QA_IDS.users.member2, genreId: QA_IDS.genres.bisnis },
    { userId: DEV_EXTRA_USER_ID, genreId: QA_IDS.genres.fiksi },
  ]);

  // 3. 5 Books (4 Available > 0, 1 Stock 0 "Buku Tidak Tersedia")
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
      {
        id: QA_IDS.books.bookE,
        title: 'Laut Bercerita',
        author: 'Leila S. Chudori',
        publisher: 'KPG',
        publicationYear: 2017,
        synopsis:
          'Kisah persahabatan, cinta, keluarga, dan kehilangan para aktivis 1998.',
        availableCount: 0,
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
    { bookId: QA_IDS.books.bookE, genreId: QA_IDS.genres.fiksi },
  ]);

  const duePlus3 = addDaysWibDateString(now, 3);
  const dueToday = addDaysWibDateString(now, 0);
  const dueMinus2 = addDaysWibDateString(now, -2);
  const dueMinus5 = addDaysWibDateString(now, -5);

  // 4. 5 Loans across 5 distinct statuses (PENDING, BORROWED, OVERDUE, FINE_PENDING, RETURNED)
  const insertedLoans = await db
    .insert(loans)
    .values([
      {
        id: QA_IDS.loans.pending,
        loanNo: 'PJM-20261109-0001',
        userId: QA_IDS.users.member1,
        bookId: QA_IDS.books.bookA,
        status: 'PENDING',
        requestedAt: now,
        confirmedAt: null,
        confirmedBy: null,
        dueDate: null,
        lateDays: 0,
        fineAmount: 0,
        fineStatus: 'Belum Bayar',
        qrTokenHash: sha256Hex(QA_PENDING_QR_TOKEN),
        manualCodeHash: sha256Hex(QA_PENDING_MANUAL_CODE),
        qrConsumedAt: null,
      },
      {
        id: QA_IDS.loans.borrow0,
        loanNo: 'PJM-20261109-0002',
        userId: QA_IDS.users.member1,
        bookId: QA_IDS.books.bookB,
        status: 'BORROWED',
        requestedAt: now,
        confirmedAt: now,
        confirmedBy: QA_IDS.users.admin,
        dueDate: duePlus3,
        lateDays: 0,
        fineAmount: 0,
        fineStatus: 'Belum Bayar',
      },
      {
        id: QA_IDS.loans.over1,
        loanNo: 'PJM-20261109-0003',
        userId: QA_IDS.users.member1,
        bookId: QA_IDS.books.bookC,
        status: 'OVERDUE',
        requestedAt: now,
        confirmedAt: now,
        confirmedBy: QA_IDS.users.admin,
        dueDate: dueMinus2,
        lateDays: 2,
        fineAmount: 2000,
        fineStatus: 'Belum Bayar',
      },
      {
        id: QA_IDS.loans.finePend,
        loanNo: 'PJM-20261109-0004',
        userId: QA_IDS.users.member2,
        bookId: QA_IDS.books.bookE,
        status: 'FINE_PENDING',
        requestedAt: now,
        confirmedAt: now,
        confirmedBy: QA_IDS.users.admin,
        dueDate: dueMinus5,
        returnRequestedAt: now,
        lateDays: 5,
        fineAmount: 15000,
        fineStatus: 'Belum Bayar',
      },
      {
        id: QA_IDS.loans.returnedOn,
        loanNo: 'PJM-20261109-0005',
        userId: QA_IDS.users.member2,
        bookId: QA_IDS.books.bookD,
        status: 'RETURNED',
        requestedAt: now,
        confirmedAt: now,
        confirmedBy: QA_IDS.users.admin,
        dueDate: dueToday,
        returnRequestedAt: now,
        returnedAt: now,
        returnConfirmedBy: QA_IDS.users.admin,
        lateDays: 0,
        fineAmount: 0,
        fineStatus: 'Belum Bayar',
      },
    ])
    .returning();

  await db.insert(loanEvents).values(
    insertedLoans.map((loan) => ({
      loanId: loan.id,
      fromStatus: null,
      toStatus: loan.status,
      actorId: QA_IDS.users.admin,
      createdAt: now,
    })),
  );

  // 5. Ratings on returned/return-pending loans so catalog cards show star ratings
  const insertedRatings = await db
    .insert(ratings)
    .values([
      {
        loanId: QA_IDS.loans.returnedOn,
        bookId: QA_IDS.books.bookD,
        userId: QA_IDS.users.member2,
        score: 5,
        createdAt: now,
      },
      {
        loanId: QA_IDS.loans.finePend,
        bookId: QA_IDS.books.bookE,
        userId: QA_IDS.users.member2,
        score: 4,
        createdAt: now,
      },
    ])
    .returning();

  // 6. 3 Notifications covering all 3 reminder types (DUE_SOON_3D, DUE_TODAY, OVERDUE)
  const insertedNotifications = await db
    .insert(notifications)
    .values([
      {
        loanId: QA_IDS.loans.borrow0,
        userId: QA_IDS.users.member1,
        type: 'DUE_SOON_3D',
        title: 'Batas pengembalian 3 hari lagi',
        text: `Clean Architecture perlu dikembalikan paling lambat ${formatIndonesianDate(duePlus3)}.`,
        isRead: false,
        createdAt: now,
      },
      {
        loanId: QA_IDS.loans.returnedOn,
        userId: QA_IDS.users.member1,
        type: 'DUE_TODAY',
        title:
          'Sapiens: Riwayat Singkat Umat Manusia sudah mencapai tenggat waktu peminjaman. Silahkan Dikembalikan',
        text: 'Sapiens: Riwayat Singkat Umat Manusia sudah mencapai tenggat waktu peminjaman. Silahkan Dikembalikan',
        isRead: true,
        createdAt: now,
      },
      {
        loanId: QA_IDS.loans.over1,
        userId: QA_IDS.users.member1,
        type: 'OVERDUE',
        title: 'Buku melewati batas pengembalian',
        text: `Filosofi Teras jatuh tempo pada ${formatIndonesianDate(dueMinus2)}. Segera ajukan pengembalian.`,
        isRead: false,
        createdAt: now,
      },
    ])
    .returning();

  return {
    users: insertedUsers.length,
    genres: insertedGenres.length,
    books: insertedBooks.length,
    loans: insertedLoans.length,
    notifications: insertedNotifications.length,
    ratings: insertedRatings.length,
  };
}
