import {
  type AdminLoanDetailData,
  type AdminLoanItem,
  type AdminLoansQuery,
  type ApiSuccessEnvelope,
  computeFineAmount,
  LOAN_STATUS_LABELS,
  type PaginatedResponse,
} from '@readonly/shared';
import { type ClockPort, SystemClock } from '../../ports/clock';
import type { StoragePort } from '../../ports/storage';
import { createNotFoundError } from '../../shared/errors';
import type { LoansRepository } from './loans.repository';

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
}

