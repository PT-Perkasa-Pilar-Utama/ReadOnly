import {
  bookGenres,
  books,
  type Database,
  genres,
  loanEvents,
  loans,
  notifications,
  QA_IDS,
  users,
} from '@readonly/db';
import {
  ADMIN_LOAN_STATUSES,
  type AdminLoanStatus,
  type AdminLoansQuery,
  type FineStatus,
  formatIndonesianDate,
  type LoanStatus,
} from '@readonly/shared';
import {
  and,
  asc,
  desc,
  eq,
  ilike,
  inArray,
  isNull,
  lt,
  or,
  type SQL,
  sql,
} from 'drizzle-orm';

export interface AdminLoanListRecord {
  id: string;
  loanNo: string;
  borrowerName: string;
  bookTitle: string;
  bookAuthor: string;
  bookCoverPath: string | null;
  confirmedAt: Date | null;
  dueDate: string | null;
  status: AdminLoanStatus;
  lateDays: number;
  fineAmount: number | null;
  fineStatus: FineStatus;
}

export interface AdminLoansQueryResult {
  items: AdminLoanListRecord[];
  total: number;
}

export interface AdminLoanDetailRecord {
  id: string;
  loanNo: string;
  status: LoanStatus;
  borrower: {
    id: string;
    fullName: string;
    email: string;
  };
  book: {
    id: string;
    title: string;
    author: string;
    publisher: string;
    publicationYear: number;
    synopsis: string;
    coverPath: string | null;
    genres: string[];
  };
  confirmedAt: Date | null;
  dueDate: string | null;
  returnRequestedAt: Date | null;
  lateDays: number;
  fineAmount: number | null;
  fineStatus: FineStatus;
}

export interface OverdueCandidateLoan {
  id: string;
  loanNo: string;
  userId: string;
  bookId: string;
  bookTitle: string;
  dueDate: string;
  status: LoanStatus;
  returnRequestedAt: Date | null;
}

export interface TransitionToOverdueInput {
  loanId: string;
  lateDays: number;
  fineAmount: number | null;
  now: Date;
  bookTitle: string;
  userId: string;
  dueDate: string;
}

export interface LoansRepository {
  listAdminLoans(params: AdminLoansQuery): Promise<AdminLoansQueryResult>;
  findAdminLoanById(id: string): Promise<AdminLoanDetailRecord | null>;
  findLoanById(id: string): Promise<AdminLoanDetailRecord | null>;
  findOverdueCandidateLoans(todayWib: string): Promise<OverdueCandidateLoan[]>;
  transitionToOverdue(params: TransitionToOverdueInput): Promise<void>;
}

export class DrizzleLoansRepository implements LoansRepository {
  constructor(private readonly db: Database) {}

  async listAdminLoans(
    params: AdminLoansQuery,
  ): Promise<AdminLoansQueryResult> {
    const conditions: SQL[] = [];

    if (params.status) {
      conditions.push(eq(loans.status, params.status));
    } else {
      conditions.push(inArray(loans.status, [...ADMIN_LOAN_STATUSES]));
    }

    if (params.q !== undefined && params.q.trim().length > 0) {
      const escaped = params.q.trim().replace(/[%_\\]/g, '\\$&');
      const pattern = `%${escaped}%`;
      const searchCondition = or(
        ilike(loans.loanNo, pattern),
        ilike(books.title, pattern),
        ilike(books.author, pattern),
        ilike(users.fullName, pattern),
      );
      if (searchCondition) {
        conditions.push(searchCondition);
      }
    }

    const [countRow] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(loans)
      .innerJoin(books, eq(loans.bookId, books.id))
      .innerJoin(users, eq(loans.userId, users.id))
      .where(and(...conditions));

    const total = countRow?.count ?? 0;
    if (total === 0) {
      return { items: [], total: 0 };
    }

    const rows = await this.db
      .select({
        id: loans.id,
        loanNo: loans.loanNo,
        borrowerName: users.fullName,
        bookTitle: books.title,
        bookAuthor: books.author,
        bookCoverPath: books.coverPath,
        confirmedAt: loans.confirmedAt,
        dueDate: loans.dueDate,
        status: loans.status,
        lateDays: loans.lateDays,
        fineAmount: loans.fineAmount,
        fineStatus: loans.fineStatus,
      })
      .from(loans)
      .innerJoin(books, eq(loans.bookId, books.id))
      .innerJoin(users, eq(loans.userId, users.id))
      .where(and(...conditions))
      .orderBy(desc(loans.requestedAt), desc(loans.id))
      .limit(params.limit)
      .offset((params.page - 1) * params.limit);

    return {
      items: rows as AdminLoanListRecord[],
      total,
    };
  }

  async findAdminLoanById(id: string): Promise<AdminLoanDetailRecord | null> {
    const [loanRow] = await this.db
      .select({
        id: loans.id,
        loanNo: loans.loanNo,
        status: loans.status,
        borrowerId: users.id,
        borrowerFullName: users.fullName,
        borrowerEmail: users.email,
        bookId: books.id,
        bookTitle: books.title,
        bookAuthor: books.author,
        bookPublisher: books.publisher,
        bookPublicationYear: books.publicationYear,
        bookSynopsis: books.synopsis,
        bookCoverPath: books.coverPath,
        confirmedAt: loans.confirmedAt,
        dueDate: loans.dueDate,
        returnRequestedAt: loans.returnRequestedAt,
        lateDays: loans.lateDays,
        fineAmount: loans.fineAmount,
        fineStatus: loans.fineStatus,
      })
      .from(loans)
      .innerJoin(users, eq(loans.userId, users.id))
      .innerJoin(books, eq(loans.bookId, books.id))
      .where(eq(loans.id, id));

    if (!loanRow) {
      return null;
    }

    const genreRows = await this.db
      .select({ name: genres.name })
      .from(bookGenres)
      .innerJoin(genres, eq(bookGenres.genreId, genres.id))
      .where(eq(bookGenres.bookId, loanRow.bookId))
      .orderBy(asc(genres.name));

    return {
      id: loanRow.id,
      loanNo: loanRow.loanNo,
      status: loanRow.status,
      borrower: {
        id: loanRow.borrowerId,
        fullName: loanRow.borrowerFullName,
        email: loanRow.borrowerEmail,
      },
      book: {
        id: loanRow.bookId,
        title: loanRow.bookTitle,
        author: loanRow.bookAuthor,
        publisher: loanRow.bookPublisher,
        publicationYear: loanRow.bookPublicationYear,
        synopsis: loanRow.bookSynopsis,
        coverPath: loanRow.bookCoverPath,
        genres: genreRows.map((g) => g.name),
      },
      confirmedAt: loanRow.confirmedAt,
      dueDate: loanRow.dueDate,
      returnRequestedAt: loanRow.returnRequestedAt,
      lateDays: loanRow.lateDays,
      fineAmount: loanRow.fineAmount,
      fineStatus: loanRow.fineStatus,
    };
  }

  async findLoanById(id: string): Promise<AdminLoanDetailRecord | null> {
    return this.findAdminLoanById(id);
  }

  async findOverdueCandidateLoans(
    todayWib: string,
  ): Promise<OverdueCandidateLoan[]> {
    const rows = await this.db
      .select({
        id: loans.id,
        loanNo: loans.loanNo,
        userId: loans.userId,
        bookId: loans.bookId,
        bookTitle: books.title,
        dueDate: loans.dueDate,
        status: loans.status,
        returnRequestedAt: loans.returnRequestedAt,
      })
      .from(loans)
      .innerJoin(books, eq(loans.bookId, books.id))
      .where(
        and(
          eq(loans.status, 'BORROWED'),
          isNull(loans.returnRequestedAt),
          lt(loans.dueDate, todayWib),
        ),
      )
      .orderBy(asc(loans.dueDate), asc(loans.id));

    return rows.map((r) => ({
      id: r.id,
      loanNo: r.loanNo,
      userId: r.userId,
      bookId: r.bookId,
      bookTitle: r.bookTitle,
      dueDate: r.dueDate ?? '',
      status: r.status,
      returnRequestedAt: r.returnRequestedAt,
    }));
  }

  async transitionToOverdue(params: TransitionToOverdueInput): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx
        .update(loans)
        .set({
          status: 'OVERDUE',
          lateDays: params.lateDays,
          fineAmount: params.fineAmount,
          fineStatus: 'Belum Bayar',
        })
        .where(eq(loans.id, params.loanId));

      await tx.insert(loanEvents).values({
        loanId: params.loanId,
        fromStatus: 'BORROWED',
        toStatus: 'OVERDUE',
        actorId: null,
        createdAt: params.now,
      });

      const formattedDueDate = formatIndonesianDate(params.dueDate);
      const notifText = `${params.bookTitle} jatuh tempo pada ${formattedDueDate}. Segera ajukan pengembalian.`;

      await tx
        .insert(notifications)
        .values({
          loanId: params.loanId,
          userId: params.userId,
          type: 'OVERDUE',
          title: 'Buku melewati batas pengembalian',
          text: notifText,
          isRead: false,
          createdAt: params.now,
        })
        .onConflictDoNothing({
          target: [notifications.loanId, notifications.type],
        });
    });
  }
}

interface InMemoryUser {
  id: string;
  fullName: string;
  email: string;
}

interface InMemoryBook {
  id: string;
  title: string;
  author: string;
  publisher: string;
  publicationYear: number;
  synopsis: string;
  coverPath: string | null;
  genres: string[];
}

export interface InMemoryLoan {
  id: string;
  loanNo: string;
  userId: string;
  bookId: string;
  status: LoanStatus;
  requestedAt: Date;
  confirmedAt: Date | null;
  dueDate: string | null;
  returnRequestedAt: Date | null;
  returnedAt: Date | null;
  lateDays: number;
  fineAmount: number | null;
  fineStatus: FineStatus;
}

export interface InMemoryLoanEvent {
  id: string;
  loanId: string;
  fromStatus: string | null;
  toStatus: string;
  actorId: string | null;
  createdAt: Date;
}

export interface InMemoryNotification {
  id: string;
  loanId: string;
  userId: string;
  type: 'DUE_SOON_3D' | 'DUE_TODAY' | 'OVERDUE';
  title: string;
  text: string;
  isRead: boolean;
  createdAt: Date;
}

export class InMemoryLoansRepository implements LoansRepository {
  private readonly users = new Map<string, InMemoryUser>();
  private readonly books = new Map<string, InMemoryBook>();
  private readonly loans: InMemoryLoan[] = [];
  private readonly loanEvents: InMemoryLoanEvent[] = [];
  private readonly notifications: InMemoryNotification[] = [];

  constructor() {
    this.seedDefaultData();
  }

  private seedDefaultData(): void {
    const defaultUser: InMemoryUser = {
      id: QA_IDS.users.member1,
      fullName: 'Member Satu',
      email: 'member1@readonly.ppu.co.id',
    };
    this.users.set(defaultUser.id, defaultUser);

    const bookB: InMemoryBook = {
      id: QA_IDS.books.bookB,
      title: 'Book-B: Clean Architecture',
      author: 'Robert C. Martin',
      publisher: 'Prentice Hall',
      publicationYear: 2017,
      synopsis: 'Buku B dengan pinjaman BORROWED aktif.',
      coverPath: 'clean-arch.jpg',
      genres: ['Teknologi'],
    };
    const bookC: InMemoryBook = {
      id: QA_IDS.books.bookC,
      title: 'Book-C: Filosofi Teras',
      author: 'Henry Manampiring',
      publisher: 'Kompas',
      publicationYear: 2018,
      synopsis: 'Buku C dengan keterlambatan 1 hari.',
      coverPath: null,
      genres: ['Bisnis'],
    };
    const bookD: InMemoryBook = {
      id: QA_IDS.books.bookD,
      title: 'Book-D: Sapiens',
      author: 'Yuval Noah Harari',
      publisher: 'KPG',
      publicationYear: 2014,
      synopsis: 'Buku D dengan keterlambatan 4 hari.',
      coverPath: null,
      genres: ['Sejarah'],
    };
    const bookE: InMemoryBook = {
      id: QA_IDS.books.bookE,
      title: 'Book-E: Designing Data-Intensive Applications',
      author: 'Martin Kleppmann',
      publisher: 'OReilly',
      publicationYear: 2017,
      synopsis: 'Buku E dengan keterlambatan 5 hari.',
      coverPath: null,
      genres: ['Teknologi'],
    };
    const bookF: InMemoryBook = {
      id: QA_IDS.books.bookF,
      title: 'Book-F: Refactoring',
      author: 'Martin Fowler',
      publisher: 'Addison-Wesley',
      publicationYear: 2018,
      synopsis: 'Buku F dengan keterlambatan 6 hari.',
      coverPath: null,
      genres: ['Teknologi'],
    };
    const bookG: InMemoryBook = {
      id: QA_IDS.books.bookG,
      title: 'Book-G: Laskar Pelangi',
      author: 'Andrea Hirata',
      publisher: 'Bentang Pustaka',
      publicationYear: 2005,
      synopsis: 'Buku G berstatus Pending Pengembalian.',
      coverPath: null,
      genres: ['Fiksi'],
    };
    const bookH: InMemoryBook = {
      id: QA_IDS.books.bookH,
      title: 'Book-H: Laut Bercerita',
      author: 'Leila S. Chudori',
      publisher: 'KPG',
      publicationYear: 2017,
      synopsis: 'Buku H berstatus Pending Keterlambatan Belum Bayar.',
      coverPath: 'laut-bercerita.jpg',
      genres: ['Drama', 'Fiksi'],
    };
    const bookI: InMemoryBook = {
      id: QA_IDS.books.bookI,
      title: 'Book-I: Atomic Habits',
      author: 'James Clear',
      publisher: 'Gramedia',
      publicationYear: 2019,
      synopsis: 'Buku I berstatus Pending Keterlambatan Sudah Bayar.',
      coverPath: null,
      genres: ['Bisnis'],
    };
    const bookJ: InMemoryBook = {
      id: QA_IDS.books.bookJ,
      title: 'Book-J: Negeri 5 Menara',
      author: 'Ahmad Fuadi',
      publisher: 'Gramedia',
      publicationYear: 2009,
      synopsis: 'Buku J sudah dikembalikan tepat waktu.',
      coverPath: null,
      genres: ['Fiksi'],
    };
    const bookK: InMemoryBook = {
      id: QA_IDS.books.bookK,
      title: 'Book-K: Perahu Kertas',
      author: 'Dee Lestari',
      publisher: 'Bentang Pustaka',
      publicationYear: 2009,
      synopsis: 'Buku K sudah dikembalikan terlambat.',
      coverPath: null,
      genres: ['Ensiklopedia Lama'],
    };

    for (const b of [
      bookB,
      bookC,
      bookD,
      bookE,
      bookF,
      bookG,
      bookH,
      bookI,
      bookJ,
      bookK,
    ]) {
      this.books.set(b.id, b);
    }

    const baseDate = new Date('2026-11-09T03:00:00.000Z');

    // 1. QA-L-PEND: PENDING
    this.loans.push({
      id: QA_IDS.loans.pending,
      loanNo: 'PJM-20261109-0001',
      userId: defaultUser.id,
      bookId: bookB.id,
      status: 'PENDING',
      requestedAt: new Date(baseDate.getTime() - 10 * 60 * 1000),
      confirmedAt: null,
      dueDate: null,
      returnRequestedAt: null,
      returnedAt: null,
      lateDays: 0,
      fineAmount: 0,
      fineStatus: 'Belum Bayar',
    });

    // 2. QA-L-BORROW-0: BORROWED
    this.loans.push({
      id: QA_IDS.loans.borrow0,
      loanNo: 'PJM-20261109-0002',
      userId: defaultUser.id,
      bookId: bookB.id,
      status: 'BORROWED',
      requestedAt: new Date(baseDate.getTime() - 9 * 60 * 1000),
      confirmedAt: baseDate,
      dueDate: '2026-11-12',
      returnRequestedAt: null,
      returnedAt: null,
      lateDays: 0,
      fineAmount: 0,
      fineStatus: 'Belum Bayar',
    });

    // 3. QA-L-OVER-1: OVERDUE, late_days = 1, fine_amount = 2000
    this.loans.push({
      id: QA_IDS.loans.over1,
      loanNo: 'PJM-20261109-0003',
      userId: defaultUser.id,
      bookId: bookC.id,
      status: 'OVERDUE',
      requestedAt: new Date(baseDate.getTime() - 8 * 60 * 1000),
      confirmedAt: baseDate,
      dueDate: '2026-11-08',
      returnRequestedAt: null,
      returnedAt: null,
      lateDays: 1,
      fineAmount: 2000,
      fineStatus: 'Belum Bayar',
    });

    // 4. QA-L-OVER-4: OVERDUE, late_days = 4, fine_amount = 2000
    this.loans.push({
      id: QA_IDS.loans.over4,
      loanNo: 'PJM-20261109-0004',
      userId: defaultUser.id,
      bookId: bookD.id,
      status: 'OVERDUE',
      requestedAt: new Date(baseDate.getTime() - 7 * 60 * 1000),
      confirmedAt: baseDate,
      dueDate: '2026-11-05',
      returnRequestedAt: null,
      returnedAt: null,
      lateDays: 4,
      fineAmount: 2000,
      fineStatus: 'Belum Bayar',
    });

    // 5. QA-L-OVER-5: OVERDUE, late_days = 5, fine_amount = null
    this.loans.push({
      id: QA_IDS.loans.over5,
      loanNo: 'PJM-20261109-0005',
      userId: defaultUser.id,
      bookId: bookE.id,
      status: 'OVERDUE',
      requestedAt: new Date(baseDate.getTime() - 6 * 60 * 1000),
      confirmedAt: baseDate,
      dueDate: '2026-11-04',
      returnRequestedAt: null,
      returnedAt: null,
      lateDays: 5,
      fineAmount: null,
      fineStatus: 'Belum Bayar',
    });

    // 6. QA-L-OVER-6: OVERDUE, late_days = 6, fine_amount = null
    this.loans.push({
      id: QA_IDS.loans.over6,
      loanNo: 'PJM-20261109-0006',
      userId: defaultUser.id,
      bookId: bookF.id,
      status: 'OVERDUE',
      requestedAt: new Date(baseDate.getTime() - 5 * 60 * 1000),
      confirmedAt: baseDate,
      dueDate: '2026-11-03',
      returnRequestedAt: null,
      returnedAt: null,
      lateDays: 6,
      fineAmount: null,
      fineStatus: 'Belum Bayar',
    });

    // 7. QA-L-RET-PEND: RETURN_PENDING, late_days = 0
    this.loans.push({
      id: QA_IDS.loans.retPend,
      loanNo: 'PJM-20261109-0007',
      userId: defaultUser.id,
      bookId: bookG.id,
      status: 'RETURN_PENDING',
      requestedAt: new Date(baseDate.getTime() - 4 * 60 * 1000),
      confirmedAt: baseDate,
      dueDate: '2026-11-09',
      returnRequestedAt: baseDate,
      returnedAt: null,
      lateDays: 0,
      fineAmount: 0,
      fineStatus: 'Belum Bayar',
    });

    // 8. QA-L-FINE-PEND: FINE_PENDING, late_days = 5, Belum Bayar
    this.loans.push({
      id: QA_IDS.loans.finePend,
      loanNo: 'PJM-20261109-0008',
      userId: defaultUser.id,
      bookId: bookH.id,
      status: 'FINE_PENDING',
      requestedAt: new Date(baseDate.getTime() - 3 * 60 * 1000),
      confirmedAt: baseDate,
      dueDate: '2026-11-04',
      returnRequestedAt: baseDate,
      returnedAt: null,
      lateDays: 5,
      fineAmount: null,
      fineStatus: 'Belum Bayar',
    });

    // 9. QA-L-FINE-PAID: FINE_PENDING, late_days = 5, fine_amount = 15000, Sudah Bayar
    this.loans.push({
      id: QA_IDS.loans.finePaid,
      loanNo: 'PJM-20261109-0009',
      userId: defaultUser.id,
      bookId: bookI.id,
      status: 'FINE_PENDING',
      requestedAt: new Date(baseDate.getTime() - 2 * 60 * 1000),
      confirmedAt: baseDate,
      dueDate: '2026-11-04',
      returnRequestedAt: baseDate,
      returnedAt: null,
      lateDays: 5,
      fineAmount: 15000,
      fineStatus: 'Sudah Bayar',
    });

    // 10. QA-L-RETURNED-ON: RETURNED, late_days = 0
    this.loans.push({
      id: QA_IDS.loans.returnedOn,
      loanNo: 'PJM-20261109-0010',
      userId: defaultUser.id,
      bookId: bookJ.id,
      status: 'RETURNED',
      requestedAt: new Date(baseDate.getTime() - 1 * 60 * 1000),
      confirmedAt: baseDate,
      dueDate: '2026-11-09',
      returnRequestedAt: baseDate,
      returnedAt: baseDate,
      lateDays: 0,
      fineAmount: 0,
      fineStatus: 'Belum Bayar',
    });

    // 11. QA-L-RETURNED-LATE: RETURNED, late_days = 3, fine = 2000
    this.loans.push({
      id: QA_IDS.loans.returnedLate,
      loanNo: 'PJM-20261109-0011',
      userId: defaultUser.id,
      bookId: bookK.id,
      status: 'RETURNED',
      requestedAt: baseDate,
      confirmedAt: baseDate,
      dueDate: '2026-11-06',
      returnRequestedAt: baseDate,
      returnedAt: baseDate,
      lateDays: 3,
      fineAmount: 2000,
      fineStatus: 'Sudah Bayar',
    });
  }

  async listAdminLoans(
    params: AdminLoansQuery,
  ): Promise<AdminLoansQueryResult> {
    const allowedStatuses: readonly AdminLoanStatus[] = params.status
      ? [params.status]
      : ADMIN_LOAN_STATUSES;

    let filtered = this.loans.filter((loan) =>
      (allowedStatuses as readonly string[]).includes(loan.status),
    );

    if (params.q !== undefined && params.q.trim().length > 0) {
      const q = params.q.trim().toLowerCase();
      filtered = filtered.filter((loan) => {
        const user = this.users.get(loan.userId);
        const book = this.books.get(loan.bookId);

        return Boolean(
          loan.loanNo.toLowerCase().includes(q) ||
            user?.fullName.toLowerCase().includes(q) ||
            book?.title.toLowerCase().includes(q) ||
            book?.author.toLowerCase().includes(q),
        );
      });
    }

    filtered.sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());

    const total = filtered.length;
    const offset = (params.page - 1) * params.limit;
    const paginated = filtered.slice(offset, offset + params.limit);

    const items: AdminLoanListRecord[] = paginated.map((loan) => {
      const user = this.users.get(loan.userId);
      const book = this.books.get(loan.bookId);

      return {
        id: loan.id,
        loanNo: loan.loanNo,
        borrowerName: user?.fullName ?? '',
        bookTitle: book?.title ?? '',
        bookAuthor: book?.author ?? '',
        bookCoverPath: book?.coverPath ?? null,
        confirmedAt: loan.confirmedAt,
        dueDate: loan.dueDate,
        status: loan.status as AdminLoanStatus,
        lateDays: loan.lateDays,
        fineAmount: loan.fineAmount,
        fineStatus: loan.fineStatus,
      };
    });

    return { items, total };
  }

  async findAdminLoanById(id: string): Promise<AdminLoanDetailRecord | null> {
    const loan = this.loans.find((l) => l.id === id);
    if (!loan) {
      return null;
    }

    const user = this.users.get(loan.userId);
    const book = this.books.get(loan.bookId);

    return {
      id: loan.id,
      loanNo: loan.loanNo,
      status: loan.status,
      borrower: {
        id: user?.id ?? loan.userId,
        fullName: user?.fullName ?? '',
        email: user?.email ?? '',
      },
      book: {
        id: book?.id ?? loan.bookId,
        title: book?.title ?? '',
        author: book?.author ?? '',
        publisher: book?.publisher ?? '',
        publicationYear: book?.publicationYear ?? 0,
        synopsis: book?.synopsis ?? '',
        coverPath: book?.coverPath ?? null,
        genres: book?.genres ?? [],
      },
      confirmedAt: loan.confirmedAt,
      dueDate: loan.dueDate,
      returnRequestedAt: loan.returnRequestedAt,
      lateDays: loan.lateDays,
      fineAmount: loan.fineAmount,
      fineStatus: loan.fineStatus,
    };
  }

  addLoan(loan: InMemoryLoan): void {
    this.loans.push(loan);
  }

  addBook(book: InMemoryBook): void {
    this.books.set(book.id, book);
  }

  addUser(user: InMemoryUser): void {
    this.users.set(user.id, user);
  }

  async findLoanById(id: string): Promise<AdminLoanDetailRecord | null> {
    return this.findAdminLoanById(id);
  }

  async findOverdueCandidateLoans(
    todayWib: string,
  ): Promise<OverdueCandidateLoan[]> {
    return this.loans
      .filter(
        (l) =>
          l.status === 'BORROWED' &&
          l.returnRequestedAt === null &&
          l.dueDate !== null &&
          l.dueDate < todayWib,
      )
      .map((l) => ({
        id: l.id,
        loanNo: l.loanNo,
        userId: l.userId,
        bookId: l.bookId,
        bookTitle: this.books.get(l.bookId)?.title ?? '',
        dueDate: l.dueDate ?? '',
        status: l.status,
        returnRequestedAt: l.returnRequestedAt,
      }));
  }

  async transitionToOverdue(params: TransitionToOverdueInput): Promise<void> {
    const loan = this.loans.find((l) => l.id === params.loanId);
    if (!loan) {
      throw new Error(
        `Loan ${params.loanId} not found in in-memory repository.`,
      );
    }

    loan.status = 'OVERDUE';
    loan.lateDays = params.lateDays;
    loan.fineAmount = params.fineAmount;
    loan.fineStatus = 'Belum Bayar';

    this.loanEvents.push({
      id: crypto.randomUUID(),
      loanId: params.loanId,
      fromStatus: 'BORROWED',
      toStatus: 'OVERDUE',
      actorId: null,
      createdAt: params.now,
    });

    const alreadyNotified = this.notifications.some(
      (n) => n.loanId === params.loanId && n.type === 'OVERDUE',
    );
    if (!alreadyNotified) {
      const formattedDueDate = formatIndonesianDate(params.dueDate);
      this.notifications.push({
        id: crypto.randomUUID(),
        loanId: params.loanId,
        userId: params.userId,
        type: 'OVERDUE',
        title: 'Buku melewati batas pengembalian',
        text: `${params.bookTitle} jatuh tempo pada ${formattedDueDate}. Segera ajukan pengembalian.`,
        isRead: false,
        createdAt: params.now,
      });
    }
  }

  getLoanEvents(loanId?: string): InMemoryLoanEvent[] {
    if (loanId) {
      return this.loanEvents.filter((e) => e.loanId === loanId);
    }
    return [...this.loanEvents];
  }

  getNotifications(loanId?: string): InMemoryNotification[] {
    if (loanId) {
      return this.notifications.filter((n) => n.loanId === loanId);
    }
    return [...this.notifications];
  }

  getLoans(): InMemoryLoan[] {
    return [...this.loans];
  }
}
