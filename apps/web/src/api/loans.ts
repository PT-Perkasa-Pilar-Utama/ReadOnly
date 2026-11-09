import {
  type FineStatus,
  LOAN_STATUS_LABELS,
  type LoanStatus,
  type Pagination,
} from '@readonly/shared';
import { ApiRequestError, apiGetResponse } from './client';

export type AdminLoanStatus = Exclude<LoanStatus, 'PENDING'>;

export const ADMIN_LOAN_STATUSES: readonly AdminLoanStatus[] = [
  'BORROWED',
  'OVERDUE',
  'RETURN_PENDING',
  'FINE_PENDING',
  'RETURNED',
];

export interface AdminLoanListItem {
  id: string;
  loan_no: string;
  borrower_name: string;
  book_title: string;
  book_author: string;
  book_cover_url: string | null;
  confirmed_at: string;
  due_date: string;
  status: AdminLoanStatus;
  status_label: string;
  late_days: number;
  fine_amount: number | null;
  fine_status: FineStatus;
}

export interface AdminLoanDetail {
  id: string;
  loan_no: string;
  status: AdminLoanStatus;
  status_label: string;
  borrower: {
    id: string;
    full_name: string;
    email: string;
  };
  book: {
    id: string;
    title: string;
    author: string;
    publisher: string;
    publication_year: number;
    synopsis: string;
    cover_url: string | null;
    genres: string[];
  };
  confirmed_at: string;
  due_date: string;
  return_requested_at: string | null;
  late_days: number;
  fine_amount: number | null;
  fine_status: FineStatus;
  can_pay_fine: boolean;
  can_confirm_return: boolean;
}

export interface AdminLoanList {
  loans: AdminLoanListItem[];
  pagination: Pagination;
}

export interface AdminLoanQuery {
  status?: AdminLoanStatus;
  q?: string;
  page?: number;
  limit?: number;
}

const QA_LOAN_IDS = {
  borrow0: '00000000-0000-4000-8003-000000000002',
  over1: '00000000-0000-4000-8003-000000000003',
  over4: '00000000-0000-4000-8003-000000000004',
  over5: '00000000-0000-4000-8003-000000000005',
  over6: '00000000-0000-4000-8003-000000000006',
  retPend: '00000000-0000-4000-8003-000000000007',
  finePend: '00000000-0000-4000-8003-000000000008',
  finePaid: '00000000-0000-4000-8003-000000000009',
  returnedOn: '00000000-0000-4000-8003-000000000010',
  returnedLate: '00000000-0000-4000-8003-000000000011',
} as const;

const QA_USER_ID = '00000000-0000-4000-8000-000000000002';
const QA_BOOK_IDS = {
  bookB: '00000000-0000-4000-8002-000000000002',
  bookC: '00000000-0000-4000-8002-000000000003',
  bookD: '00000000-0000-4000-8002-000000000004',
  bookE: '00000000-0000-4000-8002-000000000005',
  bookF: '00000000-0000-4000-8002-000000000006',
  bookG: '00000000-0000-4000-8002-000000000007',
  bookH: '00000000-0000-4000-8002-000000000008',
  bookI: '00000000-0000-4000-8002-000000000009',
  bookJ: '00000000-0000-4000-8002-000000000010',
  bookK: '00000000-0000-4000-8002-000000000011',
} as const;

function getWibDateOffset(dayOffset: number): string {
  const wibOffsetMs = 7 * 60 * 60 * 1000;
  const dayMs = 24 * 60 * 60 * 1000;
  return new Date(Date.now() + wibOffsetMs + dayOffset * dayMs)
    .toISOString()
    .slice(0, 10);
}

function getSeedTimestamp(): string {
  return `${getWibDateOffset(0)}T03:00:00.000Z`;
}

interface LocalLoanFixture {
  list: AdminLoanListItem;
  detail: AdminLoanDetail;
}

function createLocalLoanFixture(input: {
  id: string;
  loanNo: string;
  bookId: string;
  bookTitle: string;
  author: string;
  publisher: string;
  publicationYear: number;
  synopsis: string;
  genres: string[];
  status: AdminLoanStatus;
  lateDays: number;
  fineAmount: number | null;
  fineStatus: FineStatus;
  dueDayOffset: number;
  returnRequested?: boolean;
}): LocalLoanFixture {
  const confirmedAt = getSeedTimestamp();
  const dueDate = getWibDateOffset(input.dueDayOffset);
  const returnRequestedAt = input.returnRequested ? getSeedTimestamp() : null;
  const statusLabel = LOAN_STATUS_LABELS[input.status];

  return {
    list: {
      id: input.id,
      loan_no: input.loanNo,
      borrower_name: 'Member Satu',
      book_title: input.bookTitle,
      book_author: input.author,
      book_cover_url: null,
      confirmed_at: confirmedAt,
      due_date: dueDate,
      status: input.status,
      status_label: statusLabel,
      late_days: input.lateDays,
      fine_amount: input.fineAmount,
      fine_status: input.fineStatus,
    },
    detail: {
      id: input.id,
      loan_no: input.loanNo,
      status: input.status,
      status_label: statusLabel,
      borrower: {
        id: QA_USER_ID,
        full_name: 'Member Satu',
        email: 'newmember@gmail.com',
      },
      book: {
        id: input.bookId,
        title: input.bookTitle,
        author: input.author,
        publisher: input.publisher,
        publication_year: input.publicationYear,
        synopsis: input.synopsis,
        cover_url: null,
        genres: input.genres,
      },
      confirmed_at: confirmedAt,
      due_date: dueDate,
      return_requested_at: returnRequestedAt,
      late_days: input.lateDays,
      fine_amount: input.fineAmount,
      fine_status: input.fineStatus,
      can_pay_fine:
        input.status === 'FINE_PENDING' && input.fineStatus === 'Belum Bayar',
      can_confirm_return:
        input.status === 'RETURN_PENDING' ||
        (input.status === 'FINE_PENDING' && input.fineStatus === 'Sudah Bayar'),
    },
  };
}

// Fixture memakai ID pinjaman, buku, member, dan skenario yang sudah ada pada QA seeder.
const LOCAL_LOAN_FIXTURES: LocalLoanFixture[] = [
  createLocalLoanFixture({
    id: QA_LOAN_IDS.borrow0,
    loanNo: 'PJM-20261109-0002',
    bookId: QA_BOOK_IDS.bookB,
    bookTitle: 'Book-B: Clean Architecture',
    author: 'Robert C. Martin',
    publisher: 'Prentice Hall',
    publicationYear: 2017,
    synopsis: 'Buku B dengan pinjaman BORROWED aktif dan rekomendasi Member A.',
    genres: ['Teknologi'],
    status: 'BORROWED',
    lateDays: 0,
    fineAmount: 0,
    fineStatus: 'Belum Bayar',
    dueDayOffset: 3,
  }),
  createLocalLoanFixture({
    id: QA_LOAN_IDS.over1,
    loanNo: 'PJM-20261109-0003',
    bookId: QA_BOOK_IDS.bookC,
    bookTitle: 'Book-C: Filosofi Teras',
    author: 'Henry Manampiring',
    publisher: 'Kompas',
    publicationYear: 2018,
    synopsis:
      'Buku C dengan keterlambatan 1 hari (batas bawah denda otomatis).',
    genres: ['Bisnis'],
    status: 'OVERDUE',
    lateDays: 1,
    fineAmount: 2000,
    fineStatus: 'Belum Bayar',
    dueDayOffset: -1,
  }),
  createLocalLoanFixture({
    id: QA_LOAN_IDS.over4,
    loanNo: 'PJM-20261109-0004',
    bookId: QA_BOOK_IDS.bookD,
    bookTitle: 'Book-D: Sapiens',
    author: 'Yuval Noah Harari',
    publisher: 'KPG',
    publicationYear: 2014,
    synopsis: 'Buku D dengan keterlambatan 4 hari (batas atas denda otomatis).',
    genres: ['Sejarah'],
    status: 'OVERDUE',
    lateDays: 4,
    fineAmount: 2000,
    fineStatus: 'Belum Bayar',
    dueDayOffset: -4,
  }),
  createLocalLoanFixture({
    id: QA_LOAN_IDS.over5,
    loanNo: 'PJM-20261109-0005',
    bookId: QA_BOOK_IDS.bookE,
    bookTitle: 'Book-E: Designing Data-Intensive Applications',
    author: 'Martin Kleppmann',
    publisher: 'OReilly',
    publicationYear: 2017,
    synopsis: 'Buku E dengan keterlambatan 5 hari (batas bawah denda manual).',
    genres: ['Teknologi'],
    status: 'OVERDUE',
    lateDays: 5,
    fineAmount: null,
    fineStatus: 'Belum Bayar',
    dueDayOffset: -5,
  }),
  createLocalLoanFixture({
    id: QA_LOAN_IDS.over6,
    loanNo: 'PJM-20261109-0006',
    bookId: QA_BOOK_IDS.bookF,
    bookTitle: 'Book-F: Refactoring',
    author: 'Martin Fowler',
    publisher: 'Addison-Wesley',
    publicationYear: 2018,
    synopsis:
      'Buku F dengan keterlambatan 6 hari (di atas 5 hari denda manual).',
    genres: ['Teknologi'],
    status: 'OVERDUE',
    lateDays: 6,
    fineAmount: null,
    fineStatus: 'Belum Bayar',
    dueDayOffset: -6,
  }),
  createLocalLoanFixture({
    id: QA_LOAN_IDS.retPend,
    loanNo: 'PJM-20261109-0007',
    bookId: QA_BOOK_IDS.bookG,
    bookTitle: 'Book-G: Laskar Pelangi',
    author: 'Andrea Hirata',
    publisher: 'Bentang Pustaka',
    publicationYear: 2005,
    synopsis: 'Buku G berstatus Pending Pengembalian (RETURN_PENDING).',
    genres: ['Fiksi'],
    status: 'RETURN_PENDING',
    lateDays: 0,
    fineAmount: 0,
    fineStatus: 'Belum Bayar',
    dueDayOffset: 0,
    returnRequested: true,
  }),
  createLocalLoanFixture({
    id: QA_LOAN_IDS.finePend,
    loanNo: 'PJM-20261109-0008',
    bookId: QA_BOOK_IDS.bookH,
    bookTitle: 'Book-H: Laut Bercerita',
    author: 'Leila S. Chudori',
    publisher: 'KPG',
    publicationYear: 2017,
    synopsis:
      'Buku H berstatus Pending Keterlambatan (FINE_PENDING, Belum Bayar).',
    genres: ['Fiksi'],
    status: 'FINE_PENDING',
    lateDays: 5,
    fineAmount: null,
    fineStatus: 'Belum Bayar',
    dueDayOffset: -5,
    returnRequested: true,
  }),
  createLocalLoanFixture({
    id: QA_LOAN_IDS.finePaid,
    loanNo: 'PJM-20261109-0009',
    bookId: QA_BOOK_IDS.bookI,
    bookTitle: 'Book-I: Atomic Habits',
    author: 'James Clear',
    publisher: 'Gramedia',
    publicationYear: 2019,
    synopsis: 'Buku I berstatus FINE_PENDING dengan denda yang sudah dibayar.',
    genres: ['Bisnis'],
    status: 'FINE_PENDING',
    lateDays: 5,
    fineAmount: 15000,
    fineStatus: 'Sudah Bayar',
    dueDayOffset: -5,
    returnRequested: true,
  }),
  createLocalLoanFixture({
    id: QA_LOAN_IDS.returnedOn,
    loanNo: 'PJM-20261109-0010',
    bookId: QA_BOOK_IDS.bookJ,
    bookTitle: 'Book-J: Negeri 5 Menara',
    author: 'Ahmad Fuadi',
    publisher: 'Gramedia',
    publicationYear: 2009,
    synopsis: 'Buku J yang sudah dikembalikan tepat waktu (pieChart.onTime).',
    genres: ['Fiksi'],
    status: 'RETURNED',
    lateDays: 0,
    fineAmount: 0,
    fineStatus: 'Belum Bayar',
    dueDayOffset: 0,
    returnRequested: true,
  }),
  createLocalLoanFixture({
    id: QA_LOAN_IDS.returnedLate,
    loanNo: 'PJM-20261109-0011',
    bookId: QA_BOOK_IDS.bookK,
    bookTitle: 'Book-K: Perahu Kertas',
    author: 'Dee Lestari',
    publisher: 'Bentang Pustaka',
    publicationYear: 2009,
    synopsis:
      'Buku K yang sudah dikembalikan terlambat (pieChart.late) dan memakai genre nonaktif.',
    genres: ['Ensiklopedia Lama'],
    status: 'RETURNED',
    lateDays: 3,
    fineAmount: 2000,
    fineStatus: 'Sudah Bayar',
    dueDayOffset: -3,
    returnRequested: true,
  }),
];

export const isAdminLoansUsingLocalFixtures =
  import.meta.env?.DEV && import.meta.env?.VITE_LOANS_DATA_SOURCE !== 'api';

function createPagination(
  page: number,
  limit: number,
  total: number,
): Pagination {
  return {
    page,
    limit,
    total,
    totalPages: total === 0 ? 0 : Math.ceil(total / limit),
  };
}

function matchesLoanQuery(loan: AdminLoanListItem, query: string): boolean {
  const normalizedQuery = query.trim().toLocaleLowerCase('id-ID');
  if (!normalizedQuery) return true;

  return [
    loan.loan_no,
    loan.borrower_name,
    loan.book_title,
    loan.book_author,
    loan.status_label,
  ].some((value) => value.toLocaleLowerCase('id-ID').includes(normalizedQuery));
}

export async function getAdminLoans(
  query: AdminLoanQuery = {},
  signal?: AbortSignal,
): Promise<AdminLoanList> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 10;

  if (isAdminLoansUsingLocalFixtures) {
    let records = LOCAL_LOAN_FIXTURES.map((fixture) => fixture.list);
    if (query.status) {
      records = records.filter((loan) => loan.status === query.status);
    }
    if (query.q) {
      records = records.filter((loan) => matchesLoanQuery(loan, query.q ?? ''));
    }

    const start = (page - 1) * limit;
    return {
      loans: records.slice(start, start + limit),
      pagination: createPagination(page, limit, records.length),
    };
  }

  const searchParams = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  if (query.status) searchParams.set('status', query.status);
  if (query.q?.trim()) searchParams.set('q', query.q.trim());

  const response = await apiGetResponse<AdminLoanListItem[]>(
    `/admin/loans?${searchParams.toString()}`,
    signal,
  );

  const loans = response.data.filter(
    (loan) => (loan.status as LoanStatus) !== 'PENDING',
  );
  return {
    loans,
    pagination:
      response.pagination ?? createPagination(page, limit, loans.length),
  };
}

export async function getAdminLoanDetail(
  loanId: string,
  signal?: AbortSignal,
): Promise<AdminLoanDetail> {
  if (isAdminLoansUsingLocalFixtures) {
    const fixture = LOCAL_LOAN_FIXTURES.find(
      (item) => item.detail.id === loanId,
    );
    if (!fixture) {
      throw new ApiRequestError(404, 'not_found', 'not_found');
    }
    return fixture.detail;
  }

  const response = await apiGetResponse<AdminLoanDetail>(
    `/admin/loans/${encodeURIComponent(loanId)}`,
    signal,
  );
  return response.data;
}

export function getLoanStatusLabel(
  status: AdminLoanStatus,
  apiLabel?: string,
): string {
  return apiLabel?.trim() || LOAN_STATUS_LABELS[status];
}

export function getLoanStatusClass(status: AdminLoanStatus): string {
  return `loan-status-badge--${status.toLocaleLowerCase('en-US').replaceAll('_', '-')}`;
}

export function formatLoanAmount(amount: number | null): string {
  return amount === null
    ? '-'
    : `Rp ${new Intl.NumberFormat('id-ID').format(amount)}`;
}

export function formatLoanDate(value: string | null): string {
  if (!value) return '-';

  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = dateOnly ? new Date(`${value}T00:00:00+07:00`) : new Date(value);

  if (Number.isNaN(date.getTime())) return '-';

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(date);
}
