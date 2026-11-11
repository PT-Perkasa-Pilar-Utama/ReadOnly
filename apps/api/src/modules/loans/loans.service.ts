import {
  type AdminLoanDetailData,
  type AdminLoanItem,
  type AdminLoansQuery,
  type ApiSuccessEnvelope,
  calculateFine,
  computeFineAmount,
  getWibDateString,
  getWibDaysDifference,
  LOAN_STATUS_LABELS,
  type LoanStatus,
  type PaginatedResponse,
} from '@readonly/shared';
import { type ClockPort, SystemClock } from '../../ports/clock';
import type { StoragePort } from '../../ports/storage';
import {
  createInvalidStateTransitionError,
  createNotFoundError,
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
  actorId?: string | null;
  context?: {
    todayWib?: string;
  };
}

export interface LoanTransitionResult {
  loanId: string;
  previousStatus: LoanStatus;
  currentStatus: LoanStatus;
  lateDays?: number;
  fineAmount?: number | null;
}

export interface LoansServiceOptions {
  repository: LoansRepository;
  storage: StoragePort;
  clock?: ClockPort;
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
      throw createNotFoundError('Peminjaman tidak ditemukan.');
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

  getRepository(): LoansRepository {
    return this.repository;
  }

  async transition(
    options: LoanTransitionOptions,
  ): Promise<LoanTransitionResult> {
    const loan = await this.repository.findLoanById(options.loanId);
    if (!loan) {
      throw createNotFoundError('Peminjaman tidak ditemukan.');
    }

    const currentStatus = loan.status;
    const targetStatus = options.targetStatus;
    const allowed = ALLOWED_TRANSITIONS[currentStatus];

    if (!allowed?.includes(targetStatus)) {
      throw createInvalidStateTransitionError(
        `Transisi status dari ${currentStatus} ke ${targetStatus} tidak valid.`,
      );
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

    throw createInvalidStateTransitionError(
      `Transisi status ${targetStatus} belum diimplementasikan.`,
    );
  }
}
