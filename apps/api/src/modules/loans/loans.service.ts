import crypto from 'node:crypto';
import { sha256Hex } from '@readonly/db';
import {
  type AdminLoanDetailData,
  type AdminLoanItem,
  type AdminLoansQuery,
  type ApiSuccessEnvelope,
  type CreateLoanInput,
  type CreateLoanResponseData,
  calculateDueDateWib,
  calculateFine,
  computeFineAmount,
  FINE_FLAT_AMOUNT,
  FINE_MANUAL_MIN_DAYS,
  FINE_PAYMENT_SUCCESS_MESSAGE,
  FINE_REQUIRED_MESSAGE,
  type FinePaymentInput,
  type FinePaymentResponseData,
  type FineStatus,
  getWibDateString,
  getWibDaysDifference,
  LOAN_DURATION_DAYS,
  LOAN_MESSAGES,
  LOAN_STATUS_LABELS,
  type LoanQrResponseData,
  type LoanStatus,
  type MyLoanItem,
  type MyLoansQuery,
  type PaginatedResponse,
  type QrConfirmData,
  type QrPreviewData,
  RETURN_CONFIRM_SUCCESS_MESSAGE,
  RETURN_SUCCESS_MESSAGE,
  type ReturnConfirmResponseData,
  type ReturnLoanInput,
  type ReturnLoanResponseData,
  STATUS_MEMBER_ACTION_MAP,
} from '@readonly/shared';
import { type ClockPort, SystemClock } from '../../ports/clock';
import type { StoragePort } from '../../ports/storage';
import {
  createConflictError,
  createForbiddenError,
  createInvalidStateTransitionError,
  createInvalidTokenError,
  createNotFoundError,
  createValidationError,
} from '../../shared/errors';
import type { LoansRepository } from './loans.repository';

const ALLOWED_TRANSITIONS: Record<LoanStatus, readonly LoanStatus[]> = {
  PENDING: ['BORROWED'],
  BORROWED: ['OVERDUE', 'RETURN_PENDING'],
  OVERDUE: ['FINE_PENDING'],
  RETURN_PENDING: ['RETURNED'],
  FINE_PENDING: ['FINE_PENDING', 'RETURNED'],
  RETURNED: [],
};

export interface LoanTransitionOptions {
  loanId: string;
  targetStatus: LoanStatus;
  actorId?: string | null | undefined;
  context?: {
    todayWib?: string;
    ratingScore?: number;
    fineAmount?: number;
  };
}

export interface LoanTransitionResult {
  loanId: string;
  previousStatus: LoanStatus;
  currentStatus: LoanStatus;
  statusLabel?: string;
  dueDate?: string;
  lateDays?: number;
  fineAmount?: number | null;
  fineStatus?: FineStatus;
}

export interface LoansServiceOptions {
  repository: LoansRepository;
  storage: StoragePort;
  clock?: ClockPort;
}

export function generateQrToken(): { token: string; hash: string } {
  const bytes = crypto.randomBytes(16);
  const token = bytes.toString('base64url');
  const hash = hashQrToken(token);
  return { token, hash };
}

export function hashQrToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export class LoansService {
  private readonly repository: LoansRepository;
  private readonly storage: StoragePort;
  private readonly clock: ClockPort;

  constructor(options: LoansServiceOptions) {
    this.repository = options.repository;
    this.storage = options.storage;
    this.clock = options.clock ?? new SystemClock();
  }

  getClock(): ClockPort {
    return this.clock;
  }

  getStorage(): StoragePort {
    return this.storage;
  }

  getRepository(): LoansRepository {
    return this.repository;
  }

  async createLoan(
    userId: string,
    input: CreateLoanInput,
  ): Promise<ApiSuccessEnvelope<CreateLoanResponseData>> {
    const book = await this.repository.findBookById(input.book_id);
    if (!book) {
      throw createNotFoundError(LOAN_MESSAGES.BOOK_NOT_FOUND);
    }

    if (book.availableCount <= 0) {
      throw createConflictError(LOAN_MESSAGES.OUT_OF_STOCK);
    }

    const { hash } = generateQrToken();
    const loanNo = await this.repository.generateLoanNo(this.clock.now());

    const created = await this.repository.createLoan({
      loanNo,
      userId,
      bookId: input.book_id,
      status: 'PENDING',
      requestedAt: this.clock.now(),
      qrTokenHash: hash,
    });

    return {
      data: {
        id: created.id,
        loan_no: created.loanNo,
        status: 'PENDING',
        status_label: 'Pending Peminjaman',
      },
      message: LOAN_MESSAGES.APPLY_SUCCESS,
    };
  }

  async listMyLoans(
    userId: string,
    query: MyLoansQuery,
  ): Promise<PaginatedResponse<MyLoanItem>> {
    const { items, total } = await this.repository.listMyLoans(userId, query);
    const totalPages = total === 0 ? 0 : Math.ceil(total / query.limit);

    const data: MyLoanItem[] = items.map((item) => ({
      id: item.id,
      loan_no: item.loanNo,
      book_id: item.bookId,
      book_title: item.bookTitle,
      book_author: item.bookAuthor,
      book_cover_url: item.bookCoverPath
        ? this.storage.getCoverUrl(item.bookCoverPath)
        : null,
      requested_at: item.requestedAt.toISOString(),
      due_date: item.dueDate,
      status: item.status,
      status_label: LOAN_STATUS_LABELS[item.status],
      member_action: STATUS_MEMBER_ACTION_MAP[item.status],
    }));

    return {
      data,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
      },
    };
  }

  async getLoanQr(
    userId: string,
    loanId: string,
  ): Promise<ApiSuccessEnvelope<LoanQrResponseData>> {
    const loan = await this.repository.findLoanRecordById(loanId);
    if (!loan) {
      throw createNotFoundError(LOAN_MESSAGES.LOAN_NOT_FOUND);
    }

    if (loan.userId !== userId) {
      throw createForbiddenError('Akses ditolak.');
    }

    if (loan.status !== 'PENDING' || loan.qrConsumedAt !== null) {
      throw createInvalidStateTransitionError(LOAN_MESSAGES.INVALID_STATE);
    }

    const { token, hash } = generateQrToken();
    await this.repository.updateQrTokenHash(loan.id, hash);

    return {
      data: {
        loan_id: loan.id,
        loan_no: loan.loanNo,
        qr_token: token,
      },
    };
  }

  async listAdminLoans(
    query: AdminLoansQuery,
  ): Promise<PaginatedResponse<AdminLoanItem>> {
    const { items, total } = await this.repository.listAdminLoans(query);
    const totalPages = total === 0 ? 0 : Math.ceil(total / query.limit);

    const data: AdminLoanItem[] = items.map((item) => ({
      id: item.id,
      loan_no: item.loanNo,
      borrower_name: item.borrowerName,
      book_title: item.bookTitle,
      book_author: item.bookAuthor,
      book_cover_url: item.bookCoverPath
        ? this.storage.getCoverUrl(item.bookCoverPath)
        : null,
      confirmed_at: item.confirmedAt ? item.confirmedAt.toISOString() : null,
      due_date: item.dueDate,
      status: item.status,
      status_label: LOAN_STATUS_LABELS[item.status],
      late_days: item.lateDays,
      fine_amount: computeFineAmount(
        item.lateDays,
        item.fineStatus,
        item.fineAmount,
      ),
      fine_status: item.fineStatus,
    }));

    return {
      data,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
      },
    };
  }

  async getAdminLoanDetail(
    id: string,
  ): Promise<ApiSuccessEnvelope<AdminLoanDetailData>> {
    const record = await this.repository.findAdminLoanById(id);
    if (!record) {
      throw createNotFoundError(LOAN_MESSAGES.LOAN_NOT_FOUND);
    }

    const canPayFine =
      record.status === 'FINE_PENDING' && record.fineStatus === 'Belum Bayar';
    const canConfirmReturn =
      record.status === 'RETURN_PENDING' ||
      (record.status === 'FINE_PENDING' && record.fineStatus === 'Sudah Bayar');

    const data: AdminLoanDetailData = {
      id: record.id,
      loan_no: record.loanNo,
      status: record.status,
      status_label: LOAN_STATUS_LABELS[record.status],
      borrower: {
        id: record.borrower.id,
        full_name: record.borrower.fullName,
        email: record.borrower.email,
      },
      book: {
        id: record.book.id,
        title: record.book.title,
        author: record.book.author,
        publisher: record.book.publisher,
        publication_year: record.book.publicationYear,
        synopsis: record.book.synopsis,
        cover_url: record.book.coverPath
          ? this.storage.getCoverUrl(record.book.coverPath)
          : '',
        genres: record.book.genres,
      },
      confirmed_at: record.confirmedAt
        ? record.confirmedAt.toISOString()
        : null,
      due_date: record.dueDate,
      return_requested_at: record.returnRequestedAt
        ? record.returnRequestedAt.toISOString()
        : null,
      late_days: record.lateDays,
      fine_amount: computeFineAmount(
        record.lateDays,
        record.fineStatus,
        record.fineAmount,
      ),
      fine_status: record.fineStatus,
      can_pay_fine: canPayFine,
      can_confirm_return: canConfirmReturn,
    };

    return {
      data,
    };
  }

  async transition(
    options: LoanTransitionOptions,
  ): Promise<LoanTransitionResult> {
    const loan = await this.repository.findLoanById(options.loanId);
    if (!loan) {
      throw createNotFoundError(LOAN_MESSAGES.LOAN_NOT_FOUND);
    }

    const currentStatus = loan.status;
    const targetStatus = options.targetStatus;
    const allowed = ALLOWED_TRANSITIONS[currentStatus];

    if (!allowed?.includes(targetStatus)) {
      throw createInvalidStateTransitionError(
        `Transisi status dari ${currentStatus} ke ${targetStatus} tidak valid.`,
      );
    }

    if (currentStatus === 'PENDING' && targetStatus === 'BORROWED') {
      const now = this.clock.now();
      const dueDate = calculateDueDateWib(now, LOAN_DURATION_DAYS);

      const result = await this.repository.confirmPendingLoan({
        loanId: loan.id,
        adminId: options.actorId ?? '',
        now,
        dueDate,
      });

      return {
        loanId: loan.id,
        previousStatus: currentStatus,
        currentStatus: targetStatus,
        dueDate: result.dueDate,
      };
    }

    if (currentStatus === 'BORROWED' && targetStatus === 'OVERDUE') {
      if (loan.returnRequestedAt !== null) {
        throw createInvalidStateTransitionError(
          'Peminjaman telah mengajukan pengembalian.',
        );
      }

      const todayWib =
        options.context?.todayWib ?? getWibDateString(this.clock.now());

      if (!loan.dueDate || loan.dueDate >= todayWib) {
        throw createInvalidStateTransitionError(
          'Peminjaman belum melewati batas waktu.',
        );
      }

      const lateDays = getWibDaysDifference(loan.dueDate, todayWib);
      const fineAmount = calculateFine(lateDays);

      await this.repository.transitionToOverdue({
        loanId: loan.id,
        lateDays,
        fineAmount,
        now: this.clock.now(),
        bookTitle: loan.book.title,
        userId: loan.borrower.id,
        dueDate: loan.dueDate,
      });

      return {
        loanId: loan.id,
        previousStatus: currentStatus,
        currentStatus: targetStatus,
        lateDays,
        fineAmount,
      };
    }

    if (currentStatus === 'BORROWED' && targetStatus === 'RETURN_PENDING') {
      const score = options.context?.ratingScore;
      if (typeof score !== 'number') {
        throw createValidationError('Rating wajib diisi', 'score');
      }

      const now = this.clock.now();
      await this.repository.returnLoanOnTime({
        loanId: loan.id,
        bookId: loan.book.id,
        userId: options.actorId ?? loan.borrower.id,
        score,
        now,
      });

      return {
        loanId: loan.id,
        previousStatus: currentStatus,
        currentStatus: targetStatus,
        statusLabel: LOAN_STATUS_LABELS[targetStatus],
      };
    }

    if (currentStatus === 'OVERDUE' && targetStatus === 'FINE_PENDING') {
      const score = options.context?.ratingScore;
      if (typeof score !== 'number') {
        throw createValidationError('Rating wajib diisi', 'score');
      }

      const now = this.clock.now();
      const todayWib = options.context?.todayWib ?? getWibDateString(now);
      const diff = loan.dueDate
        ? getWibDaysDifference(loan.dueDate, todayWib)
        : 0;
      const lateDays = Math.max(loan.lateDays ?? 0, diff, 1);
      const fineAmount = calculateFine(lateDays);

      await this.repository.returnLoanOverdue({
        loanId: loan.id,
        bookId: loan.book.id,
        userId: options.actorId ?? loan.borrower.id,
        score,
        lateDays,
        fineAmount,
        now,
      });

      return {
        loanId: loan.id,
        previousStatus: currentStatus,
        currentStatus: targetStatus,
        statusLabel: LOAN_STATUS_LABELS[targetStatus],
        lateDays,
        fineAmount,
        fineStatus: 'Belum Bayar',
      };
    }

    if (currentStatus === 'FINE_PENDING' && targetStatus === 'FINE_PENDING') {
      if (loan.fineStatus === 'Sudah Bayar') {
        throw createInvalidStateTransitionError(
          'Peminjaman bukan berstatus Pending Keterlambatan atau denda sudah dibayar.',
        );
      }

      const fineAmount = options.context?.fineAmount;
      if (typeof fineAmount !== 'number') {
        throw createValidationError(
          'Biaya denda wajib diisi dengan angka',
          'amount',
        );
      }

      const now = this.clock.now();
      await this.repository.payFine({
        loanId: loan.id,
        adminId: options.actorId ?? '',
        fineAmount,
        now,
      });

      return {
        loanId: loan.id,
        previousStatus: currentStatus,
        currentStatus: targetStatus,
        statusLabel: LOAN_STATUS_LABELS[targetStatus],
        fineAmount,
        fineStatus: 'Sudah Bayar',
      };
    }

    if (
      (currentStatus === 'RETURN_PENDING' ||
        currentStatus === 'FINE_PENDING') &&
      targetStatus === 'RETURNED'
    ) {
      if (
        currentStatus === 'FINE_PENDING' &&
        loan.fineStatus !== 'Sudah Bayar'
      ) {
        throw createForbiddenError('Denda belum dibayar.');
      }

      const now = this.clock.now();
      await this.repository.confirmReturn({
        loanId: loan.id,
        bookId: loan.book.id,
        adminId: options.actorId ?? '',
        previousStatus: currentStatus,
        now,
      });

      return {
        loanId: loan.id,
        previousStatus: currentStatus,
        currentStatus: targetStatus,
        statusLabel: LOAN_STATUS_LABELS[targetStatus],
      };
    }

    throw createInvalidStateTransitionError(
      `Transisi status ${targetStatus} belum diimplementasikan.`,
    );
  }

  async previewQrLoan(
    qrToken: string,
  ): Promise<ApiSuccessEnvelope<QrPreviewData>> {
    if (typeof qrToken !== 'string' || qrToken.trim().length === 0) {
      throw createInvalidTokenError('QR Code tidak valid');
    }

    const tokenHash = sha256Hex(qrToken.trim());
    const record = await this.repository.findPendingLoanByQrHash(tokenHash);
    if (!record) {
      throw createInvalidTokenError('QR Code tidak valid');
    }

    const data: QrPreviewData = {
      loan_id: record.loanId,
      loan_no: record.loanNo,
      borrower_name: record.borrowerName,
      requested_at: record.requestedAt.toISOString(),
      loan_duration_days: LOAN_DURATION_DAYS,
      book: {
        id: record.book.id,
        title: record.book.title,
        author: record.book.author,
        publisher: record.book.publisher,
        publication_year: record.book.publicationYear,
        cover_url: record.book.coverPath
          ? this.storage.getCoverUrl(record.book.coverPath)
          : '',
        genres: record.book.genres,
      },
    };

    return {
      data,
    };
  }

  async confirmQrLoan(
    qrToken: string,
    adminId?: string,
  ): Promise<ApiSuccessEnvelope<QrConfirmData>> {
    if (typeof qrToken !== 'string' || qrToken.trim().length === 0) {
      throw createInvalidTokenError('QR Code tidak valid');
    }

    const tokenHash = sha256Hex(qrToken.trim());
    const preview = await this.repository.findPendingLoanByQrHash(tokenHash);
    if (!preview) {
      throw createInvalidTokenError('QR Code tidak valid');
    }

    const transitionResult = await this.transition({
      loanId: preview.loanId,
      targetStatus: 'BORROWED',
      actorId: adminId,
    });

    return {
      data: {
        loan_id: preview.loanId,
        status: 'BORROWED',
        status_label: 'Sedang Dipinjam',
        due_date: transitionResult.dueDate ?? '',
      },
      message: 'Buku berhasil Dipinjam',
    };
  }

  async returnLoan(
    userId: string,
    loanId: string,
    input: ReturnLoanInput,
  ): Promise<ApiSuccessEnvelope<ReturnLoanResponseData>> {
    const loan = await this.repository.findLoanById(loanId);
    if (!loan) {
      throw createNotFoundError(LOAN_MESSAGES.LOAN_NOT_FOUND);
    }

    if (loan.borrower.id !== userId) {
      throw createForbiddenError('Akses ditolak.');
    }

    if (loan.status !== 'BORROWED' && loan.status !== 'OVERDUE') {
      throw createInvalidStateTransitionError(
        `Transisi pengembalian dari status ${loan.status} tidak valid.`,
      );
    }

    const targetStatus =
      loan.status === 'BORROWED' ? 'RETURN_PENDING' : 'FINE_PENDING';

    await this.transition({
      loanId: loan.id,
      targetStatus,
      actorId: userId,
      context: {
        ratingScore: input.score,
      },
    });

    return {
      data: {
        loan_id: loan.id,
        status: targetStatus,
        status_label: LOAN_STATUS_LABELS[targetStatus],
      },
      message: RETURN_SUCCESS_MESSAGE,
    };
  }

  async payFine(
    adminId: string,
    loanId: string,
    input: FinePaymentInput,
  ): Promise<ApiSuccessEnvelope<FinePaymentResponseData>> {
    const loan = await this.repository.findLoanById(loanId);
    if (!loan) {
      throw createNotFoundError(LOAN_MESSAGES.LOAN_NOT_FOUND);
    }

    if (loan.status !== 'FINE_PENDING' || loan.fineStatus === 'Sudah Bayar') {
      throw createInvalidStateTransitionError(
        'Peminjaman bukan berstatus Pending Keterlambatan atau denda sudah dibayar.',
      );
    }

    let fineAmount: number;
    if (loan.lateDays >= FINE_MANUAL_MIN_DAYS) {
      if (input.amount === undefined || input.amount === null) {
        throw createValidationError(FINE_REQUIRED_MESSAGE, 'amount');
      }
      fineAmount = input.amount;
    } else {
      fineAmount = FINE_FLAT_AMOUNT;
    }

    await this.transition({
      loanId: loan.id,
      targetStatus: 'FINE_PENDING',
      actorId: adminId,
      context: {
        fineAmount,
      },
    });

    return {
      data: {
        loan_id: loan.id,
        fine_amount: fineAmount,
        fine_status: 'Sudah Bayar',
      },
      message: FINE_PAYMENT_SUCCESS_MESSAGE,
    };
  }

  async confirmReturn(
    adminId: string,
    loanId: string,
  ): Promise<ApiSuccessEnvelope<ReturnConfirmResponseData>> {
    const loan = await this.repository.findLoanById(loanId);
    if (!loan) {
      throw createNotFoundError(LOAN_MESSAGES.LOAN_NOT_FOUND);
    }

    if (loan.status === 'FINE_PENDING' && loan.fineStatus !== 'Sudah Bayar') {
      throw createForbiddenError('Denda belum dibayar.');
    }

    if (loan.status !== 'RETURN_PENDING' && loan.status !== 'FINE_PENDING') {
      throw createInvalidStateTransitionError(
        'Peminjaman tidak dapat dikonfirmasi pengembaliannya.',
      );
    }

    await this.transition({
      loanId: loan.id,
      targetStatus: 'RETURNED',
      actorId: adminId,
    });

    return {
      data: {
        loan_id: loan.id,
        status: 'RETURNED',
        status_label: 'Sudah Dikembalikan',
      },
      message: RETURN_CONFIRM_SUCCESS_MESSAGE,
    };
  }
}
