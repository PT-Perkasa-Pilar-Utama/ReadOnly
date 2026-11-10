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

export async function getAdminLoans(
  query: AdminLoanQuery = {},
  signal?: AbortSignal,
): Promise<AdminLoanList> {
  const page = query.page ?? 1;
  const limit = query.limit ?? 10;

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

  if (!response.pagination) {
    throw new ApiRequestError(
      502,
      'invalid_response',
      'Respons server tidak sesuai. Silakan coba lagi.',
    );
  }

  return {
    loans: response.data,
    pagination: response.pagination,
  };
}

export async function getAdminLoanDetail(
  loanId: string,
  signal?: AbortSignal,
): Promise<AdminLoanDetail> {
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
