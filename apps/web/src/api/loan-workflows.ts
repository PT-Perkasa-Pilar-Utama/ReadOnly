import {
  FINE_MANUAL_MAX,
  LOAN_STATUSES,
  type Pagination,
  paginationSchema,
  RATING_MAX_SCORE,
  RATING_MIN_SCORE,
} from '@readonly/shared';
import { z } from 'zod';
import { json, queryString, request } from './client';
import { envelope } from './contracts';

const memberLoanSchema = z.object({
  id: z.string(),
  loan_no: z.string(),
  book_id: z.string(),
  book_title: z.string(),
  book_author: z.string(),
  book_cover_url: z.string().nullable(),
  requested_at: z.string(),
  due_date: z.string().nullable(),
  status: z.enum(LOAN_STATUSES),
  status_label: z.string(),
  member_action: z.enum(['QR', 'Kembalikan', 'Menunggu admin', 'Selesai']),
});

const memberLoanListSchema = z.object({
  data: z.array(memberLoanSchema),
  pagination: paginationSchema,
});

export type MemberLoan = z.infer<typeof memberLoanSchema>;

export interface MemberLoanList {
  loans: MemberLoan[];
  pagination: Pagination;
}

export interface LoanQrToken {
  loan_id: string;
  loan_no: string;
  qr_token: string;
}

export interface LoanQrPreview {
  loan_id: string;
  loan_no: string;
  borrower_name: string;
  requested_at: string;
  loan_duration_days: number;
  book: {
    id: string;
    title: string;
    author: string;
    publisher: string;
    publication_year: number;
    cover_url: string | null;
    genres: string[];
  };
}

export function getRatingValidationMessage(score: number): string | null {
  return Number.isInteger(score) &&
    score >= RATING_MIN_SCORE &&
    score <= RATING_MAX_SCORE
    ? null
    : 'Rating wajib diisi';
}

export function getFineAmountValidationMessage(value: string): string | null {
  const normalized = value.trim();
  if (!/^\d+$/.test(normalized)) {
    return 'Biaya denda wajib diisi dengan angka';
  }

  const amount = Number(normalized);
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > FINE_MANUAL_MAX) {
    return 'Biaya denda wajib diisi dengan angka';
  }

  return null;
}

export async function getMyLoans(
  page = 1,
  limit = 10,
  signal?: AbortSignal,
): Promise<MemberLoanList> {
  const result = await request(
    `/loans/me?${queryString({ page, limit })}`,
    memberLoanListSchema,
    signal ? { signal } : {},
  );

  return {
    loans: result.data,
    pagination: result.pagination,
  };
}

export async function createLoan(bookId: string) {
  return request(
    '/loans',
    envelope(
      z.object({
        id: z.string(),
        loan_no: z.string(),
        status: z.literal('PENDING'),
        status_label: z.literal('Pending Peminjaman'),
      }),
    ),
    json('POST', { book_id: bookId }),
  );
}

export async function getLoanQr(loanId: string): Promise<LoanQrToken> {
  const result = await request(
    `/loans/${encodeURIComponent(loanId)}/qr`,
    envelope(
      z.object({
        loan_id: z.string(),
        loan_no: z.string(),
        qr_token: z.string().min(1),
      }),
    ),
  );

  return result.data;
}

export async function previewLoanQr(qrToken: string): Promise<LoanQrPreview> {
  const result = await request(
    '/admin/loans/qr/preview',
    envelope(
      z.object({
        loan_id: z.string(),
        loan_no: z.string(),
        borrower_name: z.string(),
        requested_at: z.string(),
        loan_duration_days: z.number(),
        book: z.object({
          id: z.string(),
          title: z.string(),
          author: z.string(),
          publisher: z.string(),
          publication_year: z.number(),
          cover_url: z.string().nullable(),
          genres: z.array(z.string()),
        }),
      }),
    ),
    json('POST', { qr_token: qrToken }),
  );

  return result.data;
}

export async function confirmLoanQr(qrToken: string) {
  return request(
    '/admin/loans/qr/confirm',
    envelope(
      z.object({
        loan_id: z.string(),
        status: z.literal('BORROWED'),
        status_label: z.literal('Sedang Dipinjam'),
        due_date: z.string(),
      }),
    ),
    json('POST', { qr_token: qrToken }),
  );
}

export async function requestLoanReturn(loanId: string, score: number) {
  return request(
    `/loans/${encodeURIComponent(loanId)}/return`,
    envelope(
      z.object({
        loan_id: z.string(),
        status: z.enum(['RETURN_PENDING', 'FINE_PENDING']),
        status_label: z.string(),
      }),
    ),
    json('POST', { score }),
  );
}

export async function payLoanFine(loanId: string, amount?: number) {
  return request(
    `/admin/loans/${encodeURIComponent(loanId)}/fine-payment`,
    envelope(
      z.object({
        loan_id: z.string(),
        fine_amount: z.number(),
        fine_status: z.literal('Sudah Bayar'),
      }),
    ),
    json('POST', amount === undefined ? {} : { amount }),
  );
}

export async function confirmLoanReturn(loanId: string) {
  return request(
    `/admin/loans/${encodeURIComponent(loanId)}/return-confirmation`,
    envelope(
      z.object({
        loan_id: z.string(),
        status: z.literal('RETURNED'),
        status_label: z.literal('Sudah Dikembalikan'),
      }),
    ),
    { method: 'POST' },
  );
}
