import crypto from 'node:crypto';
import {
  bookGenres,
  books,
  type Database,
  genres,
  loanEvents,
  loans,
  notifications,
  QA_IDS,
  QA_PENDING_MANUAL_CODE,
  QA_PENDING_QR_TOKEN,
  ratings,
  sha256Hex,
  users,
} from '@readonly/db';
import {
  ADMIN_LOAN_STATUSES,
  type AdminLoanStatus,
  type AdminLoansQuery,
  type FineStatus,
  formatIndonesianDate,
  LOAN_STATUS_LABELS,
  type LoanStatus,
  type MyLoansQuery,
  UUID_REGEX,
} from '@readonly/shared';
import {
  and,
  asc,
  desc,
  eq,
  gt,
  ilike,
  inArray,
  isNull,
  lt,
  or,
  type SQL,
  sql,
} from 'drizzle-orm';
import {
  createConflictError,
  createForbiddenError,
  createInvalidStateTransitionError,
  createInvalidTokenError,
  createNotFoundError,
} from '../../shared/errors';

export interface LoanBookRecord {
  id: string;
  title: string;
  author: string;
  availableCount: number;
  coverPath: string | null;
}

export interface InsertLoanData {
  loanNo: string;
  userId: string;
  bookId: string;
  status: 'PENDING';
  requestedAt: Date;
  qrTokenHash: string;
  manualCodeHash: string;
}

export interface CreatedLoanRecord {
  id: string;
  loanNo: string;
  status: 'PENDING';
}

export interface MyLoanListRecord {
  id: string;
  loanNo: string;
  bookId: string;
  bookTitle: string;
  bookAuthor: string;
  bookCoverPath: string | null;
  requestedAt: Date;
  dueDate: string | null;
  status: LoanStatus;
}

export interface MyLoansQueryResult {
  items: MyLoanListRecord[];
  total: number;
}

export interface LoanRecord {
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
  qrTokenHash: string | null;
  manualCodeHash: string | null;
  qrConsumedAt: Date | null;
}

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

export function formatLoanDatePrefix(date: Date): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date).replace(/-/g, '');
}

export interface QrPreviewRecord {
  loanId: string;
  loanNo: string;
  borrowerName: string;
  requestedAt: Date;
  book: {
    id: string;
    title: string;
    author: string;
    publisher: string;
    publicationYear: number;
    coverPath: string | null;
    genres: string[];
  };
}

export interface ConfirmPendingLoanParams {
  loanId: string;
  adminId: string;
  now: Date;
  dueDate: string;
}

export interface ConfirmPendingLoanResult {
  loanId: string;
  status: 'BORROWED';
  statusLabel: string;
  dueDate: string;
}

export interface ReturnLoanOnTimeParams {
  loanId: string;
  bookId: string;
  userId: string;
  score: number;
  now: Date;
}

export interface ReturnLoanOverdueParams {
  loanId: string;
  bookId: string;
  userId: string;
  score: number;
  lateDays: number;
  fineAmount: number | null;
  now: Date;
}

export interface PayFineParams {
  loanId: string;
  adminId: string;
  fineAmount: number;
  now: Date;
}

export interface ConfirmReturnParams {
  loanId: string;
  bookId: string;
  adminId: string;
  previousStatus: 'RETURN_PENDING' | 'FINE_PENDING';
  now: Date;
}

export interface LoansRepository {
  findBookById(bookId: string): Promise<LoanBookRecord | null>;
  generateLoanNo(date: Date): Promise<string>;
  createLoan(data: InsertLoanData): Promise<CreatedLoanRecord>;
  listMyLoans(
    userId: string,
    params: MyLoansQuery,
  ): Promise<MyLoansQueryResult>;
  findLoanRecordById(loanId: string): Promise<LoanRecord | null>;
  updateQrTokenHash(
    loanId: string,
    qrTokenHash: string,
    manualCodeHash: string,
  ): Promise<void>;
  listAdminLoans(params: AdminLoansQuery): Promise<AdminLoansQueryResult>;
  findAdminLoanById(id: string): Promise<AdminLoanDetailRecord | null>;
  findLoanById(id: string): Promise<AdminLoanDetailRecord | null>;
  findOverdueCandidateLoans(todayWib: string): Promise<OverdueCandidateLoan[]>;
  transitionToOverdue(params: TransitionToOverdueInput): Promise<void>;
  findPendingLoanByQrHash(qrTokenHash: string): Promise<QrPreviewRecord | null>;
  confirmPendingLoan(
    params: ConfirmPendingLoanParams,
  ): Promise<ConfirmPendingLoanResult>;
  returnLoanOnTime(params: ReturnLoanOnTimeParams): Promise<void>;
  returnLoanOverdue(params: ReturnLoanOverdueParams): Promise<void>;
  payFine(params: PayFineParams): Promise<void>;
  confirmReturn(params: ConfirmReturnParams): Promise<void>;
}

export class DrizzleLoansRepository implements LoansRepository {
  constructor(private readonly db: Database) {}

  async findBookById(bookId: string): Promise<LoanBookRecord | null> {
    const [row] = await this.db
      .select({
        id: books.id,
        title: books.title,
        author: books.author,
        availableCount: books.availableCount,
        coverPath: books.coverPath,
        deletedAt: books.deletedAt,
      })
      .from(books)
      .where(eq(books.id, bookId));

    if (!row || row.deletedAt !== null) {
      return null;
    }

    return {
      id: row.id,
      title: row.title,
      author: row.author,
      availableCount: row.availableCount,
      coverPath: row.coverPath,
    };
  }

  async generateLoanNo(date: Date): Promise<string> {
    const dateStr = formatLoanDatePrefix(date);
    const prefix = `PJM-${dateStr}-`;

    const [latestLoan] = await this.db
      .select({ loanNo: loans.loanNo })
      .from(loans)
      .where(sql`${loans.loanNo} LIKE ${`${prefix}%`}`)
      .orderBy(desc(loans.loanNo))
      .limit(1);

    let nextSeq = 1;
    if (latestLoan?.loanNo) {
      const suffix = latestLoan.loanNo.slice(prefix.length);
      const parsed = parseInt(suffix, 10);
      if (!Number.isNaN(parsed)) {
        nextSeq = parsed + 1;
      }
    }

    return `${prefix}${String(nextSeq).padStart(4, '0')}`;
  }

  async createLoan(data: InsertLoanData): Promise<CreatedLoanRecord> {
    const [inserted] = await this.db
      .insert(loans)
      .values({
        loanNo: data.loanNo,
        userId: data.userId,
        bookId: data.bookId,
        status: data.status,
        requestedAt: data.requestedAt,
        qrTokenHash: data.qrTokenHash,
        manualCodeHash: data.manualCodeHash,
        lateDays: 0,
        fineStatus: 'Belum Bayar',
      })
      .returning({
        id: loans.id,
        loanNo: loans.loanNo,
        status: loans.status,
      });

    return inserted as CreatedLoanRecord;
  }

  async listMyLoans(
    userId: string,
    params: MyLoansQuery,
  ): Promise<MyLoansQueryResult> {
    const [countRow] = await this.db
      .select({ count: sql<number>`count(*)::int` })
      .from(loans)
      .where(eq(loans.userId, userId));

    const total = countRow?.count ?? 0;
    if (total === 0) {
      return { items: [], total: 0 };
    }

    const rows = await this.db
      .select({
        id: loans.id,
        loanNo: loans.loanNo,
        bookId: books.id,
        bookTitle: books.title,
        bookAuthor: books.author,
        bookCoverPath: books.coverPath,
        requestedAt: loans.requestedAt,
        dueDate: loans.dueDate,
        status: loans.status,
      })
      .from(loans)
      .innerJoin(books, eq(loans.bookId, books.id))
      .where(eq(loans.userId, userId))
      .orderBy(desc(loans.requestedAt), desc(loans.id))
      .limit(params.limit)
      .offset((params.page - 1) * params.limit);

    return {
      items: rows as MyLoanListRecord[],
      total,
    };
  }

  async findLoanRecordById(loanId: string): Promise<LoanRecord | null> {
    const [row] = await this.db
      .select({
        id: loans.id,
        loanNo: loans.loanNo,
        userId: loans.userId,
        bookId: loans.bookId,
        status: loans.status,
        requestedAt: loans.requestedAt,
        confirmedAt: loans.confirmedAt,
        dueDate: loans.dueDate,
        returnRequestedAt: loans.returnRequestedAt,
        returnedAt: loans.returnedAt,
        lateDays: loans.lateDays,
        fineAmount: loans.fineAmount,
        fineStatus: loans.fineStatus,
        qrTokenHash: loans.qrTokenHash,
        manualCodeHash: loans.manualCodeHash,
        qrConsumedAt: loans.qrConsumedAt,
      })
      .from(loans)
      .where(eq(loans.id, loanId));

    if (!row) {
      return null;
    }

    return row as LoanRecord;
  }

  async updateQrTokenHash(
    loanId: string,
    qrTokenHash: string,
    manualCodeHash: string,
  ): Promise<void> {
    await this.db
      .update(loans)
      .set({ qrTokenHash, manualCodeHash })
      .where(eq(loans.id, loanId));
  }

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
          userId: params.userId,
          loanId: params.loanId,
          type: 'OVERDUE',
          title: 'Buku melewati batas pengembalian',
          text: notifText,
          isRead: false,
          createdAt: params.now,
        })
        .onConflictDoNothing();
    });
  }

  async findPendingLoanByQrHash(
    qrTokenHash: string,
  ): Promise<QrPreviewRecord | null> {
    const [loanRow] = await this.db
      .select({
        loanId: loans.id,
        loanNo: loans.loanNo,
        requestedAt: loans.requestedAt,
        borrowerName: users.fullName,
        bookId: books.id,
        bookTitle: books.title,
        bookAuthor: books.author,
        bookPublisher: books.publisher,
        bookPublicationYear: books.publicationYear,
        bookCoverPath: books.coverPath,
      })
      .from(loans)
      .innerJoin(users, eq(loans.userId, users.id))
      .innerJoin(books, eq(loans.bookId, books.id))
      .where(
        and(
          or(
            eq(loans.qrTokenHash, qrTokenHash),
            eq(loans.manualCodeHash, qrTokenHash),
          ),
          eq(loans.status, 'PENDING'),
          isNull(loans.qrConsumedAt),
        ),
      );

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
      loanId: loanRow.loanId,
      loanNo: loanRow.loanNo,
      borrowerName: loanRow.borrowerName,
      requestedAt: loanRow.requestedAt,
      book: {
        id: loanRow.bookId,
        title: loanRow.bookTitle,
        author: loanRow.bookAuthor,
        publisher: loanRow.bookPublisher,
        publicationYear: loanRow.bookPublicationYear,
        coverPath: loanRow.bookCoverPath,
        genres: genreRows.map((g) => g.name),
      },
    };
  }

  async confirmPendingLoan(
    params: ConfirmPendingLoanParams,
  ): Promise<ConfirmPendingLoanResult> {
    return await this.db.transaction(async (tx) => {
      const [loanRow] = await tx
        .select({
          id: loans.id,
          bookId: loans.bookId,
        })
        .from(loans)
        .where(
          and(
            eq(loans.id, params.loanId),
            eq(loans.status, 'PENDING'),
            isNull(loans.qrConsumedAt),
          ),
        )
        .for('update');

      if (!loanRow) {
        throw createInvalidTokenError('QR Code tidak valid');
      }

      const [updatedBook] = await tx
        .update(books)
        .set({ availableCount: sql`${books.availableCount} - 1` })
        .where(and(eq(books.id, loanRow.bookId), gt(books.availableCount, 0)))
        .returning({ id: books.id });

      if (!updatedBook) {
        throw createConflictError('Buku tidak tersedia (stok habis)');
      }

      const actorId =
        params.adminId && UUID_REGEX.test(params.adminId)
          ? params.adminId
          : null;

      const [updatedLoan] = await tx
        .update(loans)
        .set({
          status: 'BORROWED',
          confirmedAt: params.now,
          confirmedBy: actorId,
          dueDate: params.dueDate,
          qrTokenHash: null,
          manualCodeHash: null,
          qrConsumedAt: params.now,
        })
        .where(
          and(
            eq(loans.id, params.loanId),
            eq(loans.status, 'PENDING'),
            isNull(loans.qrConsumedAt),
          ),
        )
        .returning({ id: loans.id });

      if (!updatedLoan) {
        throw createInvalidTokenError('QR Code tidak valid');
      }

      await tx.insert(loanEvents).values({
        loanId: params.loanId,
        fromStatus: 'PENDING',
        toStatus: 'BORROWED',
        actorId,
        createdAt: params.now,
      });

      return {
        loanId: params.loanId,
        status: 'BORROWED',
        statusLabel: LOAN_STATUS_LABELS.BORROWED,
        dueDate: params.dueDate,
      };
    });
  }

  async returnLoanOnTime(params: ReturnLoanOnTimeParams): Promise<void> {
    await this.db.transaction(async (tx) => {
      const [loanRow] = await tx
        .select({
          id: loans.id,
          bookId: loans.bookId,
          userId: loans.userId,
          status: loans.status,
        })
        .from(loans)
        .where(eq(loans.id, params.loanId))
        .for('update');

      if (!loanRow) {
        throw createNotFoundError('Peminjaman tidak ditemukan.');
      }

      if (loanRow.status !== 'BORROWED') {
        throw createInvalidStateTransitionError(
          'Peminjaman bukan berstatus Sedang Dipinjam.',
        );
      }

      const [updatedLoan] = await tx
        .update(loans)
        .set({
          status: 'RETURN_PENDING',
          returnRequestedAt: params.now,
          lateDays: 0,
          fineAmount: 0,
        })
        .where(and(eq(loans.id, params.loanId), eq(loans.status, 'BORROWED')))
        .returning({ id: loans.id });

      if (!updatedLoan) {
        throw createInvalidStateTransitionError(
          'Peminjaman bukan berstatus Sedang Dipinjam.',
        );
      }

      await tx.insert(ratings).values({
        loanId: params.loanId,
        bookId: params.bookId,
        userId: params.userId,
        score: params.score,
        createdAt: params.now,
      });

      const actorId =
        params.userId && UUID_REGEX.test(params.userId) ? params.userId : null;

      await tx.insert(loanEvents).values({
        loanId: params.loanId,
        fromStatus: 'BORROWED',
        toStatus: 'RETURN_PENDING',
        actorId,
        createdAt: params.now,
      });
    });
  }

  async returnLoanOverdue(params: ReturnLoanOverdueParams): Promise<void> {
    await this.db.transaction(async (tx) => {
      const [loanRow] = await tx
        .select({
          id: loans.id,
          bookId: loans.bookId,
          userId: loans.userId,
          status: loans.status,
        })
        .from(loans)
        .where(eq(loans.id, params.loanId))
        .for('update');

      if (!loanRow) {
        throw createNotFoundError('Peminjaman tidak ditemukan.');
      }

      if (loanRow.status !== 'OVERDUE') {
        throw createInvalidStateTransitionError(
          'Peminjaman bukan berstatus Terlambat.',
        );
      }

      const [updatedLoan] = await tx
        .update(loans)
        .set({
          status: 'FINE_PENDING',
          returnRequestedAt: params.now,
          lateDays: params.lateDays,
          fineAmount: params.fineAmount,
          fineStatus: 'Belum Bayar',
        })
        .where(and(eq(loans.id, params.loanId), eq(loans.status, 'OVERDUE')))
        .returning({ id: loans.id });

      if (!updatedLoan) {
        throw createInvalidStateTransitionError(
          'Peminjaman bukan berstatus Terlambat.',
        );
      }

      await tx.insert(ratings).values({
        loanId: params.loanId,
        bookId: params.bookId,
        userId: params.userId,
        score: params.score,
        createdAt: params.now,
      });

      const actorId =
        params.userId && UUID_REGEX.test(params.userId) ? params.userId : null;

      await tx.insert(loanEvents).values({
        loanId: params.loanId,
        fromStatus: 'OVERDUE',
        toStatus: 'FINE_PENDING',
        actorId,
        createdAt: params.now,
      });
    });
  }

  async payFine(params: PayFineParams): Promise<void> {
    await this.db.transaction(async (tx) => {
      const [loanRow] = await tx
        .select({
          id: loans.id,
          status: loans.status,
          fineStatus: loans.fineStatus,
        })
        .from(loans)
        .where(eq(loans.id, params.loanId))
        .for('update');

      if (!loanRow) {
        throw createNotFoundError('Peminjaman tidak ditemukan.');
      }

      if (
        loanRow.status !== 'FINE_PENDING' ||
        loanRow.fineStatus !== 'Belum Bayar'
      ) {
        throw createInvalidStateTransitionError(
          'Peminjaman bukan berstatus Pending Keterlambatan atau denda sudah dibayar.',
        );
      }

      const actorId =
        params.adminId && UUID_REGEX.test(params.adminId)
          ? params.adminId
          : null;

      const [updatedLoan] = await tx
        .update(loans)
        .set({
          fineAmount: params.fineAmount,
          fineStatus: 'Sudah Bayar',
          finePaidAt: params.now,
          finePaidBy: actorId,
        })
        .where(
          and(
            eq(loans.id, params.loanId),
            eq(loans.status, 'FINE_PENDING'),
            eq(loans.fineStatus, 'Belum Bayar'),
          ),
        )
        .returning({ id: loans.id });

      if (!updatedLoan) {
        throw createInvalidStateTransitionError(
          'Peminjaman bukan berstatus Pending Keterlambatan atau denda sudah dibayar.',
        );
      }

      await tx.insert(loanEvents).values({
        loanId: params.loanId,
        fromStatus: 'FINE_PENDING',
        toStatus: 'FINE_PENDING',
        actorId,
        createdAt: params.now,
      });
    });
  }

  async confirmReturn(params: ConfirmReturnParams): Promise<void> {
    await this.db.transaction(async (tx) => {
      const [loanRow] = await tx
        .select({
          id: loans.id,
          bookId: loans.bookId,
          status: loans.status,
          fineStatus: loans.fineStatus,
        })
        .from(loans)
        .where(eq(loans.id, params.loanId))
        .for('update');

      if (!loanRow) {
        throw createNotFoundError('Peminjaman tidak ditemukan.');
      }

      if (loanRow.status !== params.previousStatus) {
        throw createInvalidStateTransitionError(
          'Peminjaman tidak dapat dikonfirmasi pengembaliannya.',
        );
      }

      if (
        loanRow.status === 'FINE_PENDING' &&
        loanRow.fineStatus !== 'Sudah Bayar'
      ) {
        throw createForbiddenError('Denda belum dibayar.');
      }

      const actorId =
        params.adminId && UUID_REGEX.test(params.adminId)
          ? params.adminId
          : null;

      const [updatedLoan] = await tx
        .update(loans)
        .set({
          status: 'RETURNED',
          returnedAt: params.now,
          returnConfirmedBy: actorId,
        })
        .where(
          and(
            eq(loans.id, params.loanId),
            eq(loans.status, params.previousStatus),
          ),
        )
        .returning({ id: loans.id });

      if (!updatedLoan) {
        throw createInvalidStateTransitionError(
          'Peminjaman tidak dapat dikonfirmasi pengembaliannya.',
        );
      }

      await tx
        .update(books)
        .set({ availableCount: sql`${books.availableCount} + 1` })
        .where(eq(books.id, loanRow.bookId));

      await tx.insert(loanEvents).values({
        loanId: params.loanId,
        fromStatus: params.previousStatus,
        toStatus: 'RETURNED',
        actorId,
        createdAt: params.now,
      });
    });
  }
}

export interface InMemoryBook {
  id: string;
  title: string;
  author: string;
  publisher?: string;
  publicationYear?: number;
  synopsis?: string;
  availableCount: number;
  coverPath: string | null;
  deletedAt?: Date | null;
  genres?: string[];
}

export interface InMemoryUser {
  id: string;
  fullName: string;
  email: string;
  role?: 'member' | 'admin';
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
  finePaidAt?: Date | null;
  finePaidBy?: string | null;
  returnConfirmedBy?: string | null;
  qrTokenHash?: string | null;
  manualCodeHash?: string | null;
  qrConsumedAt?: Date | null;
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
  userId: string;
  loanId: string;
  type: 'DUE_SOON_3D' | 'DUE_TODAY' | 'OVERDUE';
  title: string;
  text: string;
  isRead: boolean;
  createdAt: Date;
}

export interface InMemoryRating {
  id: string;
  loanId: string;
  bookId: string;
  userId: string;
  score: number;
  createdAt: Date;
}

export class InMemoryLoansRepository implements LoansRepository {
  private readonly users = new Map<string, InMemoryUser>();
  private readonly books = new Map<string, InMemoryBook>();
  private readonly loans: InMemoryLoan[] = [];
  private readonly loanEvents: InMemoryLoanEvent[] = [];
  private readonly ratings: InMemoryRating[] = [];
  private readonly notifications: InMemoryNotification[] = [];

  constructor() {
    this.seedDefaultData();
  }

  private seedDefaultData(): void {
    const defaultUser: InMemoryUser = {
      id: QA_IDS.users.member1,
      fullName: 'Member Satu',
      email: 'member1@readonly.ppu.co.id',
      role: 'member',
    };
    this.users.set(defaultUser.id, defaultUser);

    const member2: InMemoryUser = {
      id: QA_IDS.users.member2,
      fullName: 'Siti Rahma',
      email: 'member2@readonly.ppu.co.id',
      role: 'member',
    };
    this.users.set(member2.id, member2);

    const adminUser: InMemoryUser = {
      id: QA_IDS.users.admin,
      fullName: 'Admin Perpus QA',
      email: 'admin@readonly.ppu.co.id',
      role: 'admin',
    };
    this.users.set(adminUser.id, adminUser);

    const bookA: InMemoryBook = {
      id: QA_IDS.books.bookA,
      title: 'Book-A: Clean Code',
      author: 'Robert C. Martin',
      publisher: 'Prentice Hall',
      publicationYear: 2008,
      synopsis: 'Panduan menulis kode yang bersih.',
      availableCount: 2,
      coverPath: 'clean-code.jpg',
      deletedAt: null,
      genres: ['Teknologi'],
    };
    const bookB: InMemoryBook = {
      id: QA_IDS.books.bookB,
      title: 'Book-B: Clean Architecture',
      author: 'Robert C. Martin',
      publisher: 'Prentice Hall',
      publicationYear: 2017,
      synopsis: 'Buku B dengan pinjaman BORROWED aktif.',
      availableCount: 2,
      coverPath: 'clean-arch.jpg',
      deletedAt: null,
      genres: ['Teknologi'],
    };
    const bookC: InMemoryBook = {
      id: QA_IDS.books.bookC,
      title: 'Book-C: Filosofi Teras',
      author: 'Henry Manampiring',
      publisher: 'Kompas',
      publicationYear: 2018,
      synopsis: 'Buku C dengan keterlambatan 1 hari.',
      availableCount: 0,
      coverPath: null,
      deletedAt: null,
      genres: ['Bisnis'],
    };
    const bookD: InMemoryBook = {
      id: QA_IDS.books.bookD,
      title: 'Book-D: Sapiens',
      author: 'Yuval Noah Harari',
      publisher: 'KPG',
      publicationYear: 2014,
      synopsis: 'Buku D dengan keterlambatan 4 hari.',
      availableCount: 0,
      coverPath: null,
      deletedAt: null,
      genres: ['Sejarah'],
    };
    const bookE: InMemoryBook = {
      id: QA_IDS.books.bookE,
      title: 'Book-E: Designing Data-Intensive Applications',
      author: 'Martin Kleppmann',
      publisher: 'OReilly',
      publicationYear: 2017,
      synopsis: 'Buku E dengan keterlambatan 5 hari.',
      availableCount: 0,
      coverPath: null,
      deletedAt: null,
      genres: ['Teknologi'],
    };
    const bookF: InMemoryBook = {
      id: QA_IDS.books.bookF,
      title: 'Book-F: Refactoring',
      author: 'Martin Fowler',
      publisher: 'Addison-Wesley',
      publicationYear: 2018,
      synopsis: 'Buku F dengan keterlambatan 6 hari.',
      availableCount: 0,
      coverPath: null,
      deletedAt: null,
      genres: ['Teknologi'],
    };
    const bookG: InMemoryBook = {
      id: QA_IDS.books.bookG,
      title: 'Book-G: Laskar Pelangi',
      author: 'Andrea Hirata',
      publisher: 'Bentang Pustaka',
      publicationYear: 2005,
      synopsis: 'Buku G berstatus Pending Pengembalian.',
      availableCount: 1,
      coverPath: null,
      deletedAt: null,
      genres: ['Fiksi'],
    };
    const bookH: InMemoryBook = {
      id: QA_IDS.books.bookH,
      title: 'Book-H: Laut Bercerita',
      author: 'Leila S. Chudori',
      publisher: 'KPG',
      publicationYear: 2017,
      synopsis: 'Buku H berstatus Pending Keterlambatan Belum Bayar.',
      availableCount: 0,
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
      availableCount: 0,
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
      availableCount: 2,
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
      availableCount: 1,
      coverPath: null,
      genres: ['Ensiklopedia Lama'],
    };
    const bookEmpty: InMemoryBook = {
      id: QA_IDS.books.bookEmpty,
      title: 'Book-Empty: Out of Stock Book',
      author: 'No Author',
      publisher: 'Prentice Hall',
      publicationYear: 2020,
      synopsis: 'Buku dengan stok 0 untuk pengujian ketersediaan.',
      availableCount: 0,
      coverPath: null,
      deletedAt: null,
      genres: ['Teknologi'],
    };

    for (const b of [
      bookA,
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
      bookEmpty,
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
      qrTokenHash: sha256Hex(QA_PENDING_QR_TOKEN),
      manualCodeHash: sha256Hex(QA_PENDING_MANUAL_CODE),
      qrConsumedAt: null,
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
      qrTokenHash: null,
      qrConsumedAt: baseDate,
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
      qrTokenHash: null,
      qrConsumedAt: baseDate,
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
      qrTokenHash: null,
      qrConsumedAt: baseDate,
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
      qrTokenHash: null,
      qrConsumedAt: baseDate,
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
      qrTokenHash: null,
      qrConsumedAt: baseDate,
    });

    // 7. QA-L-RET-PEND: RETURN_PENDING
    this.loans.push({
      id: QA_IDS.loans.retPend,
      loanNo: 'PJM-20261109-0007',
      userId: defaultUser.id,
      bookId: bookG.id,
      status: 'RETURN_PENDING',
      requestedAt: new Date(baseDate.getTime() - 4 * 60 * 1000),
      confirmedAt: baseDate,
      dueDate: '2026-11-16',
      returnRequestedAt: baseDate,
      returnedAt: null,
      lateDays: 0,
      fineAmount: 0,
      fineStatus: 'Belum Bayar',
      qrTokenHash: null,
      qrConsumedAt: baseDate,
    });

    // 8. QA-L-FINE-PEND: FINE_PENDING, late_days = 5, fine_amount = null, Belum Bayar
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
      qrTokenHash: null,
      qrConsumedAt: baseDate,
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
      qrTokenHash: null,
      qrConsumedAt: baseDate,
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
      qrTokenHash: null,
      qrConsumedAt: baseDate,
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
      qrTokenHash: null,
      qrConsumedAt: baseDate,
    });
  }

  async findBookById(bookId: string): Promise<LoanBookRecord | null> {
    const book = this.books.get(bookId);
    if (!book || book.deletedAt !== null) {
      return null;
    }
    return {
      id: book.id,
      title: book.title,
      author: book.author,
      availableCount: book.availableCount ?? 1,
      coverPath: book.coverPath,
    };
  }

  async generateLoanNo(date: Date): Promise<string> {
    const dateStr = formatLoanDatePrefix(date);
    const prefix = `PJM-${dateStr}-`;

    const matchingLoans = this.loans.filter((l) => l.loanNo.startsWith(prefix));
    let maxSeq = 0;
    for (const loan of matchingLoans) {
      const suffix = loan.loanNo.slice(prefix.length);
      const parsed = parseInt(suffix, 10);
      if (!Number.isNaN(parsed) && parsed > maxSeq) {
        maxSeq = parsed;
      }
    }

    return `${prefix}${String(maxSeq + 1).padStart(4, '0')}`;
  }

  async createLoan(data: InsertLoanData): Promise<CreatedLoanRecord> {
    const newLoan: InMemoryLoan = {
      id: crypto.randomUUID(),
      loanNo: data.loanNo,
      userId: data.userId,
      bookId: data.bookId,
      status: data.status,
      requestedAt: data.requestedAt,
      confirmedAt: null,
      dueDate: null,
      returnRequestedAt: null,
      returnedAt: null,
      lateDays: 0,
      fineAmount: null,
      fineStatus: 'Belum Bayar',
      qrTokenHash: data.qrTokenHash,
      manualCodeHash: data.manualCodeHash,
      qrConsumedAt: null,
    };

    this.loans.push(newLoan);

    return {
      id: newLoan.id,
      loanNo: newLoan.loanNo,
      status: 'PENDING',
    };
  }

  async listMyLoans(
    userId: string,
    params: MyLoansQuery,
  ): Promise<MyLoansQueryResult> {
    const userLoans = this.loans.filter((l) => l.userId === userId);
    userLoans.sort((a, b) => b.requestedAt.getTime() - a.requestedAt.getTime());

    const total = userLoans.length;
    const offset = (params.page - 1) * params.limit;
    const paginated = userLoans.slice(offset, offset + params.limit);

    const items: MyLoanListRecord[] = paginated.map((loan) => {
      const book = this.books.get(loan.bookId);
      return {
        id: loan.id,
        loanNo: loan.loanNo,
        bookId: loan.bookId,
        bookTitle: book?.title ?? 'Unknown Book',
        bookAuthor: book?.author ?? 'Unknown Author',
        bookCoverPath: book?.coverPath ?? null,
        requestedAt: loan.requestedAt,
        dueDate: loan.dueDate,
        status: loan.status,
      };
    });

    return { items, total };
  }

  async findLoanRecordById(loanId: string): Promise<LoanRecord | null> {
    const loan = this.loans.find((l) => l.id === loanId);
    if (!loan) {
      return null;
    }
    return {
      id: loan.id,
      loanNo: loan.loanNo,
      userId: loan.userId,
      bookId: loan.bookId,
      status: loan.status,
      requestedAt: loan.requestedAt,
      confirmedAt: loan.confirmedAt,
      dueDate: loan.dueDate,
      returnRequestedAt: loan.returnRequestedAt,
      returnedAt: loan.returnedAt,
      lateDays: loan.lateDays,
      fineAmount: loan.fineAmount,
      fineStatus: loan.fineStatus,
      qrTokenHash: loan.qrTokenHash ?? null,
      manualCodeHash: loan.manualCodeHash ?? null,
      qrConsumedAt: loan.qrConsumedAt ?? null,
    };
  }

  async updateQrTokenHash(
    loanId: string,
    qrTokenHash: string,
    manualCodeHash: string,
  ): Promise<void> {
    const loan = this.loans.find((l) => l.id === loanId);
    if (loan) {
      loan.qrTokenHash = qrTokenHash;
      loan.manualCodeHash = manualCodeHash;
    }
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
        userId: params.userId,
        loanId: params.loanId,
        type: 'OVERDUE',
        title: 'Buku melewati batas pengembalian',
        text: `${params.bookTitle} jatuh tempo pada ${formattedDueDate}. Segera ajukan pengembalian.`,
        isRead: false,
        createdAt: params.now,
      });
    }
  }

  addBook(book: InMemoryBook): void {
    this.books.set(book.id, book);
  }

  addUser(user: InMemoryUser): void {
    this.users.set(user.id, user);
  }

  addLoan(loan: InMemoryLoan): void {
    this.loans.push(loan);
  }

  clearLoans(): void {
    this.loans.length = 0;
  }

  clearNotifications(): void {
    this.notifications.length = 0;
  }

  getLoans(): readonly InMemoryLoan[] {
    return this.loans;
  }

  getLoanEvents(loanId?: string): readonly InMemoryLoanEvent[] {
    if (loanId) {
      return this.loanEvents.filter((e) => e.loanId === loanId);
    }
    return this.loanEvents;
  }

  getNotifications(loanId?: string): readonly InMemoryNotification[] {
    if (loanId) {
      return this.notifications.filter((n) => n.loanId === loanId);
    }
    return this.notifications;
  }

  async findPendingLoanByQrHash(
    qrTokenHash: string,
  ): Promise<QrPreviewRecord | null> {
    const loan = this.loans.find(
      (item) =>
        (item.qrTokenHash === qrTokenHash ||
          item.manualCodeHash === qrTokenHash) &&
        item.status === 'PENDING' &&
        item.qrConsumedAt === null,
    );
    if (!loan) {
      return null;
    }

    const user = this.users.get(loan.userId);
    const book = this.books.get(loan.bookId);
    if (!user || !book) {
      return null;
    }

    return {
      loanId: loan.id,
      loanNo: loan.loanNo,
      borrowerName: user.fullName,
      requestedAt: loan.requestedAt,
      book: {
        id: book.id,
        title: book.title,
        author: book.author,
        publisher: book.publisher ?? '',
        publicationYear: book.publicationYear ?? 0,
        coverPath: book.coverPath,
        genres: [...(book.genres ?? [])],
      },
    };
  }

  async confirmPendingLoan(
    params: ConfirmPendingLoanParams,
  ): Promise<ConfirmPendingLoanResult> {
    const loan = this.loans.find(
      (item) =>
        item.id === params.loanId &&
        item.status === 'PENDING' &&
        item.qrConsumedAt === null,
    );
    if (!loan) {
      throw createInvalidTokenError('QR Code tidak valid');
    }

    const book = this.books.get(loan.bookId);
    if (!book || book.availableCount <= 0) {
      throw createConflictError('Buku tidak tersedia (stok habis)');
    }

    book.availableCount -= 1;

    loan.status = 'BORROWED';
    loan.confirmedAt = params.now;
    loan.dueDate = params.dueDate;
    loan.qrTokenHash = null;
    loan.manualCodeHash = null;
    loan.qrConsumedAt = params.now;

    const actorId =
      params.adminId && UUID_REGEX.test(params.adminId) ? params.adminId : null;

    this.loanEvents.push({
      id: crypto.randomUUID(),
      loanId: params.loanId,
      fromStatus: 'PENDING',
      toStatus: 'BORROWED',
      actorId,
      createdAt: params.now,
    });

    return {
      loanId: params.loanId,
      status: 'BORROWED',
      statusLabel: LOAN_STATUS_LABELS.BORROWED,
      dueDate: params.dueDate,
    };
  }

  setBookAvailableCount(bookId: string, count: number): void {
    const book = this.books.get(bookId);
    if (book) {
      book.availableCount = count;
    }
  }

  getBook(bookId: string): InMemoryBook | undefined {
    return this.books.get(bookId);
  }

  getAllBooks(): readonly InMemoryBook[] {
    return Array.from(this.books.values());
  }

  async returnLoanOnTime(params: ReturnLoanOnTimeParams): Promise<void> {
    const loan = this.loans.find((item) => item.id === params.loanId);
    if (!loan) {
      throw createNotFoundError('Peminjaman tidak ditemukan.');
    }

    if (loan.status !== 'BORROWED') {
      throw createInvalidStateTransitionError(
        'Peminjaman bukan berstatus Sedang Dipinjam.',
      );
    }

    loan.status = 'RETURN_PENDING';
    loan.returnRequestedAt = params.now;
    loan.lateDays = 0;
    loan.fineAmount = 0;

    this.ratings.push({
      id: crypto.randomUUID(),
      loanId: params.loanId,
      bookId: params.bookId,
      userId: params.userId,
      score: params.score,
      createdAt: params.now,
    });

    const actorId =
      params.userId && UUID_REGEX.test(params.userId) ? params.userId : null;

    this.loanEvents.push({
      id: crypto.randomUUID(),
      loanId: params.loanId,
      fromStatus: 'BORROWED',
      toStatus: 'RETURN_PENDING',
      actorId,
      createdAt: params.now,
    });
  }

  async returnLoanOverdue(params: ReturnLoanOverdueParams): Promise<void> {
    const loan = this.loans.find((item) => item.id === params.loanId);
    if (!loan) {
      throw createNotFoundError('Peminjaman tidak ditemukan.');
    }

    if (loan.status !== 'OVERDUE') {
      throw createInvalidStateTransitionError(
        'Peminjaman bukan berstatus Terlambat.',
      );
    }

    loan.status = 'FINE_PENDING';
    loan.returnRequestedAt = params.now;
    loan.lateDays = params.lateDays;
    loan.fineAmount = params.fineAmount;
    loan.fineStatus = 'Belum Bayar';

    this.ratings.push({
      id: crypto.randomUUID(),
      loanId: params.loanId,
      bookId: params.bookId,
      userId: params.userId,
      score: params.score,
      createdAt: params.now,
    });

    const actorId =
      params.userId && UUID_REGEX.test(params.userId) ? params.userId : null;

    this.loanEvents.push({
      id: crypto.randomUUID(),
      loanId: params.loanId,
      fromStatus: 'OVERDUE',
      toStatus: 'FINE_PENDING',
      actorId,
      createdAt: params.now,
    });
  }

  async payFine(params: PayFineParams): Promise<void> {
    const loan = this.loans.find((item) => item.id === params.loanId);
    if (!loan) {
      throw createNotFoundError('Peminjaman tidak ditemukan.');
    }

    if (loan.status !== 'FINE_PENDING' || loan.fineStatus !== 'Belum Bayar') {
      throw createInvalidStateTransitionError(
        'Peminjaman bukan berstatus Pending Keterlambatan atau denda sudah dibayar.',
      );
    }

    loan.fineAmount = params.fineAmount;
    loan.fineStatus = 'Sudah Bayar';
    loan.finePaidAt = params.now;
    loan.finePaidBy = params.adminId;

    const actorId =
      params.adminId && UUID_REGEX.test(params.adminId) ? params.adminId : null;

    this.loanEvents.push({
      id: crypto.randomUUID(),
      loanId: params.loanId,
      fromStatus: 'FINE_PENDING',
      toStatus: 'FINE_PENDING',
      actorId,
      createdAt: params.now,
    });
  }

  async confirmReturn(params: ConfirmReturnParams): Promise<void> {
    const loan = this.loans.find((item) => item.id === params.loanId);
    if (!loan) {
      throw createNotFoundError('Peminjaman tidak ditemukan.');
    }

    if (loan.status !== params.previousStatus) {
      throw createInvalidStateTransitionError(
        'Peminjaman tidak dapat dikonfirmasi pengembaliannya.',
      );
    }

    if (loan.status === 'FINE_PENDING' && loan.fineStatus !== 'Sudah Bayar') {
      throw createForbiddenError('Denda belum dibayar.');
    }

    loan.status = 'RETURNED';
    loan.returnedAt = params.now;
    loan.returnConfirmedBy = params.adminId;

    const book = this.books.get(params.bookId);
    if (book) {
      book.availableCount += 1;
    }

    const actorId =
      params.adminId && UUID_REGEX.test(params.adminId) ? params.adminId : null;

    this.loanEvents.push({
      id: crypto.randomUUID(),
      loanId: params.loanId,
      fromStatus: params.previousStatus,
      toStatus: 'RETURNED',
      actorId,
      createdAt: params.now,
    });
  }

  getRatings(loanId?: string): InMemoryRating[] {
    if (loanId) {
      return this.ratings.filter((r) => r.loanId === loanId);
    }
    return [...this.ratings];
  }

  getLoan(loanId: string): InMemoryLoan | undefined {
    return this.loans.find((l) => l.id === loanId);
  }
}
