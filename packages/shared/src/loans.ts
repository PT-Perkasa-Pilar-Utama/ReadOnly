import { z } from 'zod';
import { paginationSchema } from './api';
import { UUID_REGEX } from './auth';
import {
  calculateFine,
  FINE_STATUSES,
  type FineStatus,
  LOAN_STATUSES,
} from './constants';

export const ADMIN_LOAN_STATUSES = [
  'BORROWED',
  'OVERDUE',
  'RETURN_PENDING',
  'FINE_PENDING',
  'RETURNED',
] as const;

export type AdminLoanStatus = (typeof ADMIN_LOAN_STATUSES)[number];

export function computeFineAmount(
  lateDays: number,
  fineStatus: FineStatus,
  storedFineAmount?: number | null,
): number | null {
  if (fineStatus === 'Sudah Bayar') {
    return storedFineAmount ?? calculateFine(lateDays);
  }
  return calculateFine(lateDays);
}

export const adminLoansQuerySchema = z.object({
  status: z.enum(ADMIN_LOAN_STATUSES).optional(),
  q: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export type AdminLoansQuery = z.infer<typeof adminLoansQuerySchema>;

export const adminLoanItemSchema = z.object({
  id: z.string().regex(UUID_REGEX),
  loan_no: z.string(),
  borrower_name: z.string(),
  book_title: z.string(),
  book_author: z.string(),
  book_cover_url: z.string().nullable(),
  confirmed_at: z.string().nullable(),
  due_date: z.string().nullable(),
  status: z.enum(ADMIN_LOAN_STATUSES),
  status_label: z.string(),
  late_days: z.number().int().nonnegative(),
  fine_amount: z.number().int().nonnegative().nullable(),
  fine_status: z.enum(FINE_STATUSES),
});

export type AdminLoanItem = z.infer<typeof adminLoanItemSchema>;

export const adminLoansResponseSchema = z.object({
  data: z.array(adminLoanItemSchema),
  pagination: paginationSchema,
});

export type AdminLoansResponse = z.infer<typeof adminLoansResponseSchema>;

export const adminLoanDetailBorrowerSchema = z.object({
  id: z.string().regex(UUID_REGEX),
  full_name: z.string(),
  email: z.string().email(),
});

export type AdminLoanDetailBorrower = z.infer<
  typeof adminLoanDetailBorrowerSchema
>;

export const adminLoanDetailBookSchema = z.object({
  id: z.string().regex(UUID_REGEX),
  title: z.string(),
  author: z.string(),
  publisher: z.string(),
  publication_year: z.number().int(),
  synopsis: z.string(),
  cover_url: z.string(),
  genres: z.array(z.string()),
});

export type AdminLoanDetailBook = z.infer<typeof adminLoanDetailBookSchema>;

export const adminLoanDetailDataSchema = z.object({
  id: z.string().regex(UUID_REGEX),
  loan_no: z.string(),
  status: z.enum(LOAN_STATUSES),
  status_label: z.string(),
  borrower: adminLoanDetailBorrowerSchema,
  book: adminLoanDetailBookSchema,
  confirmed_at: z.string().nullable(),
  due_date: z.string().nullable(),
  return_requested_at: z.string().nullable(),
  late_days: z.number().int().nonnegative(),
  fine_amount: z.number().int().nonnegative().nullable(),
  fine_status: z.enum(FINE_STATUSES),
  can_pay_fine: z.boolean(),
  can_confirm_return: z.boolean(),
});

export type AdminLoanDetailData = z.infer<typeof adminLoanDetailDataSchema>;

export const adminLoanDetailResponseSchema = z.object({
  data: adminLoanDetailDataSchema,
});

export type AdminLoanDetailResponse = z.infer<
  typeof adminLoanDetailResponseSchema
>;
