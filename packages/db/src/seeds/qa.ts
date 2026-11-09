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
  QA_PENDING_QR_TOKEN,
  type SeedCounts,
  type SeedOptions,
  sha256Hex,
} from './shared';

export interface QaExpectedDashboardSummary {
  totalBooks: number;
  totalAvailability: number;
  borrowedCount: number;
  overdueCount: number;
  returnedCount: number;
  pieChart: {
    onTime: number;
    late: number;
  };
}

export const QA_EXPECTED_DASHBOARD_SUMMARY: QaExpectedDashboardSummary = {
  totalBooks: 12,
  totalAvailability: 8,
  borrowedCount: 2,
  overdueCount: 6,
  returnedCount: 2,
  pieChart: {
    onTime: 1,
    late: 1,
  },
};

export async function seedQa(
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
        email: 'member1@readonly.ppu.co.id',
        passwordHash: memberPasswordHash,
        address: 'Jl. Sudirman No. 1, Jakarta',
        phoneNumber: '081200000001',
        role: 'member',
        status: 'active',
        createdAt: now,
      },
      {
        id: QA_IDS.users.member2,
        fullName: 'Member Dua',
        email: 'member2@readonly.ppu.co.id',
        passwordHash: memberPasswordHash,
        address: 'Jl. Thamrin No. 2, Jakarta',
        phoneNumber: '081200000002',
        role: 'member',
        status: 'active',
        createdAt: now,
      },
      {
        id: QA_IDS.users.inactiveMember,
        fullName: 'Member Nonaktif',
        email: 'inactive@readonly.ppu.co.id',
        passwordHash: memberPasswordHash,
        address: 'Jl. Gatot Subroto No. 3, Jakarta',
        phoneNumber: '081200000003',
        role: 'member',
        status: 'inactive',
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
      {
        id: QA_IDS.genres.unused,
        name: 'Puisi Klasik',
        status: 'active',
        createdAt: now,
      },
      {
        id: QA_IDS.genres.inactive,
        name: 'Ensiklopedia Lama',
        status: 'inactive',
        createdAt: now,
      },
    ])
    .returning();

  await db.insert(userGenres).values([
    { userId: QA_IDS.users.member1, genreId: QA_IDS.genres.fiksi },
    { userId: QA_IDS.users.member1, genreId: QA_IDS.genres.teknologi },
    { userId: QA_IDS.users.member2, genreId: QA_IDS.genres.sejarah },
  ]);

  // 12 active books with available_count sum = 2 + 2 + 0 + 0 + 0 + 0 + 1 + 0 + 0 + 2 + 1 + 0 = 8
  const insertedBooks = await db
    .insert(books)
    .values([
      {
        id: QA_IDS.books.bookA,
        title: 'Book-A: Bumi Manusia',
        author: 'Pramoedya Ananta Toer',
        publisher: 'Lentera Dipantara',
        publicationYear: 1980,
        synopsis: 'Buku A untuk pengujian konfirmasi QR peminjaman PENDING.',
        availableCount: 2,
        coverPath: null,
        createdAt: now,
      },
      {
        id: QA_IDS.books.bookB,
        title: 'Book-B: Clean Architecture',
        author: 'Robert C. Martin',
        publisher: 'Prentice Hall',
        publicationYear: 2017,
        synopsis:
          'Buku B dengan pinjaman BORROWED aktif dan rekomendasi Member A.',
        availableCount: 2,
        coverPath: null,
        createdAt: now,
      },
      {
        id: QA_IDS.books.bookC,
        title: 'Book-C: Filosofi Teras',
        author: 'Henry Manampiring',
        publisher: 'Kompas',
        publicationYear: 2018,
        synopsis:
          'Buku C dengan keterlambatan 1 hari (batas bawah denda otomatis).',
        availableCount: 0,
        coverPath: null,
        createdAt: now,
      },
      {
        id: QA_IDS.books.bookD,
        title: 'Book-D: Sapiens',
        author: 'Yuval Noah Harari',
        publisher: 'KPG',
        publicationYear: 2014,
        synopsis:
          'Buku D dengan keterlambatan 4 hari (batas atas denda otomatis).',
        availableCount: 0,
        coverPath: null,
        createdAt: now,
      },
      {
        id: QA_IDS.books.bookE,
        title: 'Book-E: Designing Data-Intensive Applications',
        author: 'Martin Kleppmann',
        publisher: 'OReilly',
        publicationYear: 2017,
        synopsis:
          'Buku E dengan keterlambatan 5 hari (batas bawah denda manual).',
        availableCount: 0,
        coverPath: null,
        createdAt: now,
      },
      {
        id: QA_IDS.books.bookF,
        title: 'Book-F: Refactoring',
        author: 'Martin Fowler',
        publisher: 'Addison-Wesley',
        publicationYear: 2018,
        synopsis:
          'Buku F dengan keterlambatan 6 hari (di atas 5 hari denda manual).',
        availableCount: 0,
        coverPath: null,
        createdAt: now,
      },
      {
        id: QA_IDS.books.bookG,
        title: 'Book-G: Laskar Pelangi',
        author: 'Andrea Hirata',
        publisher: 'Bentang Pustaka',
        publicationYear: 2005,
        synopsis: 'Buku G berstatus Pending Pengembalian (RETURN_PENDING).',
        availableCount: 1,
        coverPath: null,
        createdAt: now,
      },
      {
        id: QA_IDS.books.bookH,
        title: 'Book-H: Laut Bercerita',
        author: 'Leila S. Chudori',
        publisher: 'KPG',
        publicationYear: 2017,
        synopsis:
          'Buku H berstatus Pending Keterlambatan (FINE_PENDING, Belum Bayar).',
        availableCount: 0,
        coverPath: null,
        createdAt: now,
      },
      {
        id: QA_IDS.books.bookI,
        title: 'Book-I: Atomic Habits',
        author: 'James Clear',
        publisher: 'Gramedia',
        publicationYear: 2019,
        synopsis:
          'Buku I berstatus Pending Keterlambatan (FINE_PENDING, Sudah Bayar).',
        availableCount: 0,
        coverPath: null,
        createdAt: now,
      },
      {
        id: QA_IDS.books.bookJ,
        title: 'Book-J: Negeri 5 Menara',
        author: 'Ahmad Fuadi',
        publisher: 'Gramedia',
        publicationYear: 2009,
        synopsis:
          'Buku J yang sudah dikembalikan tepat waktu (pieChart.onTime).',
        availableCount: 2,
        coverPath: null,
        createdAt: now,
      },
      {
        id: QA_IDS.books.bookK,
        title: 'Book-K: Perahu Kertas',
        author: 'Dee Lestari',
        publisher: 'Bentang Pustaka',
        publicationYear: 2009,
        synopsis:
          'Buku K yang sudah dikembalikan terlambat (pieChart.late) & genre nonaktif.',
        availableCount: 1,
        coverPath: null,
        createdAt: now,
      },
      {
        id: QA_IDS.books.bookEmpty,
        title: 'Book-Empty: Cantik Itu Luka',
        author: 'Eka Kurniawan',
        publisher: 'Gramedia',
        publicationYear: 2002,
        synopsis:
          'Buku dengan stok 0 untuk pengujian tombol Pinjam disable (AC-08.04).',
        availableCount: 0,
        coverPath: null,
        createdAt: now,
      },
    ])
    .returning();

  await db.insert(bookGenres).values([
    { bookId: QA_IDS.books.bookA, genreId: QA_IDS.genres.fiksi },
    { bookId: QA_IDS.books.bookB, genreId: QA_IDS.genres.teknologi },
    { bookId: QA_IDS.books.bookC, genreId: QA_IDS.genres.bisnis },
    { bookId: QA_IDS.books.bookD, genreId: QA_IDS.genres.sejarah },
    { bookId: QA_IDS.books.bookE, genreId: QA_IDS.genres.teknologi },
    { bookId: QA_IDS.books.bookF, genreId: QA_IDS.genres.teknologi },
    { bookId: QA_IDS.books.bookG, genreId: QA_IDS.genres.fiksi },
    { bookId: QA_IDS.books.bookH, genreId: QA_IDS.genres.fiksi },
    { bookId: QA_IDS.books.bookI, genreId: QA_IDS.genres.bisnis },
    { bookId: QA_IDS.books.bookJ, genreId: QA_IDS.genres.fiksi },
    { bookId: QA_IDS.books.bookK, genreId: QA_IDS.genres.inactive },
    { bookId: QA_IDS.books.bookEmpty, genreId: QA_IDS.genres.sains },
  ]);

  const duePlus3 = addDaysWibDateString(now, 3);
  const dueToday = addDaysWibDateString(now, 0);
  const dueMinus1 = addDaysWibDateString(now, -1);
  const dueMinus3 = addDaysWibDateString(now, -3);
  const dueMinus4 = addDaysWibDateString(now, -4);
  const dueMinus5 = addDaysWibDateString(now, -5);
  const dueMinus6 = addDaysWibDateString(now, -6);

  const insertedLoans = await db
    .insert(loans)
    .values([
      // 1. QA-L-PEND (PENDING)
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
        qrConsumedAt: null,
      },
      // 2. QA-L-BORROW-0 (BORROWED, due in 3 days for DUE_SOON_3D notification & AC-10.04)
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
      // 3. QA-L-OVER-1 (OVERDUE, late_days = 1, fine_amount = 2000)
      {
        id: QA_IDS.loans.over1,
        loanNo: 'PJM-20261109-0003',
        userId: QA_IDS.users.member1,
        bookId: QA_IDS.books.bookC,
        status: 'OVERDUE',
        requestedAt: now,
        confirmedAt: now,
        confirmedBy: QA_IDS.users.admin,
        dueDate: dueMinus1,
        lateDays: 1,
        fineAmount: 2000,
        fineStatus: 'Belum Bayar',
      },
      // 4. QA-L-OVER-4 (OVERDUE, late_days = 4, fine_amount = 2000)
      {
        id: QA_IDS.loans.over4,
        loanNo: 'PJM-20261109-0004',
        userId: QA_IDS.users.member1,
        bookId: QA_IDS.books.bookD,
        status: 'OVERDUE',
        requestedAt: now,
        confirmedAt: now,
        confirmedBy: QA_IDS.users.admin,
        dueDate: dueMinus4,
        lateDays: 4,
        fineAmount: 2000,
        fineStatus: 'Belum Bayar',
      },
      // 5. QA-L-OVER-5 (OVERDUE, late_days = 5, fine_amount = null)
      {
        id: QA_IDS.loans.over5,
        loanNo: 'PJM-20261109-0005',
        userId: QA_IDS.users.member1,
        bookId: QA_IDS.books.bookE,
        status: 'OVERDUE',
        requestedAt: now,
        confirmedAt: now,
        confirmedBy: QA_IDS.users.admin,
        dueDate: dueMinus5,
        lateDays: 5,
        fineAmount: null,
        fineStatus: 'Belum Bayar',
      },
      // 6. QA-L-OVER-6 (OVERDUE, late_days = 6, fine_amount = null)
      {
        id: QA_IDS.loans.over6,
        loanNo: 'PJM-20261109-0006',
        userId: QA_IDS.users.member1,
        bookId: QA_IDS.books.bookF,
        status: 'OVERDUE',
        requestedAt: now,
        confirmedAt: now,
        confirmedBy: QA_IDS.users.admin,
        dueDate: dueMinus6,
        lateDays: 6,
        fineAmount: null,
        fineStatus: 'Belum Bayar',
      },
      // 7. QA-L-RET-PEND (RETURN_PENDING, late_days = 0)
      {
        id: QA_IDS.loans.retPend,
        loanNo: 'PJM-20261109-0007',
        userId: QA_IDS.users.member1,
        bookId: QA_IDS.books.bookG,
        status: 'RETURN_PENDING',
        requestedAt: now,
        confirmedAt: now,
        confirmedBy: QA_IDS.users.admin,
        dueDate: dueToday,
        returnRequestedAt: now,
        lateDays: 0,
        fineAmount: 0,
        fineStatus: 'Belum Bayar',
      },
      // 8. QA-L-FINE-PEND (FINE_PENDING, late_days = 5, Belum Bayar)
      {
        id: QA_IDS.loans.finePend,
        loanNo: 'PJM-20261109-0008',
        userId: QA_IDS.users.member1,
        bookId: QA_IDS.books.bookH,
        status: 'FINE_PENDING',
        requestedAt: now,
        confirmedAt: now,
        confirmedBy: QA_IDS.users.admin,
        dueDate: dueMinus5,
        returnRequestedAt: now,
        lateDays: 5,
        fineAmount: null,
        fineStatus: 'Belum Bayar',
      },
      // 9. QA-L-FINE-PAID (FINE_PENDING, late_days = 5, fine_amount = 15000, Sudah Bayar)
      {
        id: QA_IDS.loans.finePaid,
        loanNo: 'PJM-20261109-0009',
        userId: QA_IDS.users.member1,
        bookId: QA_IDS.books.bookI,
        status: 'FINE_PENDING',
        requestedAt: now,
        confirmedAt: now,
        confirmedBy: QA_IDS.users.admin,
        dueDate: dueMinus5,
        returnRequestedAt: now,
        lateDays: 5,
        fineAmount: 15000,
        fineStatus: 'Sudah Bayar',
        finePaidAt: now,
        finePaidBy: QA_IDS.users.admin,
      },
      // 10. QA-L-RETURNED-ON (RETURNED, late_days = 0 -> pieChart.onTime = 1)
      {
        id: QA_IDS.loans.returnedOn,
        loanNo: 'PJM-20261109-0010',
        userId: QA_IDS.users.member1,
        bookId: QA_IDS.books.bookJ,
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
      // 11. QA-L-RETURNED-LATE (RETURNED, late_days = 3, fine = 2000 -> pieChart.late = 1)
      {
        id: QA_IDS.loans.returnedLate,
        loanNo: 'PJM-20261109-0011',
        userId: QA_IDS.users.member1,
        bookId: QA_IDS.books.bookK,
        status: 'RETURNED',
        requestedAt: now,
        confirmedAt: now,
        confirmedBy: QA_IDS.users.admin,
        dueDate: dueMinus3,
        returnRequestedAt: now,
        returnedAt: now,
        returnConfirmedBy: QA_IDS.users.admin,
        lateDays: 3,
        fineAmount: 2000,
        fineStatus: 'Sudah Bayar',
        finePaidAt: now,
        finePaidBy: QA_IDS.users.admin,
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

  const insertedRatings = await db
    .insert(ratings)
    .values([
      {
        loanId: QA_IDS.loans.retPend,
        bookId: QA_IDS.books.bookG,
        userId: QA_IDS.users.member1,
        score: 5,
        createdAt: now,
      },
      {
        loanId: QA_IDS.loans.returnedOn,
        bookId: QA_IDS.books.bookJ,
        userId: QA_IDS.users.member1,
        score: 4,
        createdAt: now,
      },
      {
        loanId: QA_IDS.loans.returnedLate,
        bookId: QA_IDS.books.bookK,
        userId: QA_IDS.users.member1,
        score: 4,
        createdAt: now,
      },
    ])
    .returning();

  const insertedNotifications = await db
    .insert(notifications)
    .values([
      {
        loanId: QA_IDS.loans.borrow0,
        userId: QA_IDS.users.member1,
        type: 'DUE_SOON_3D',
        title: 'Batas pengembalian 3 hari lagi',
        text: `Book-B: Clean Architecture perlu dikembalikan paling lambat ${formatIndonesianDate(duePlus3)}.`,
        isRead: false,
        createdAt: now,
      },
      {
        loanId: QA_IDS.loans.retPend,
        userId: QA_IDS.users.member1,
        type: 'DUE_TODAY',
        title:
          'Book-G: Laskar Pelangi sudah mencapai tenggat waktu peminjaman. Silahkan Dikembalikan',
        text: 'Book-G: Laskar Pelangi sudah mencapai tenggat waktu peminjaman. Silahkan Dikembalikan',
        isRead: false,
        createdAt: now,
      },
      {
        loanId: QA_IDS.loans.over1,
        userId: QA_IDS.users.member1,
        type: 'OVERDUE',
        title: 'Buku melewati batas pengembalian',
        text: `Book-C: Filosofi Teras jatuh tempo pada ${formatIndonesianDate(dueMinus1)}. Segera ajukan pengembalian.`,
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
