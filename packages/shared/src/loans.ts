import { z } from 'zod';
import { type PaginatedResponse, paginationSchema } from './api';
import { UUID_REGEX } from './auth';
import {
  calculateFine,
  FINE_MANUAL_MAX,
  FINE_STATUSES,
  type FineStatus,
  LOAN_STATUS_LABELS,
  LOAN_STATUSES,
  type LoanStatus,
  RATING_MAX_SCORE,
  RATING_MIN_SCORE,
} from './constants';

export {
  FINE_STATUSES,
  type FineStatus,
  LOAN_STATUS_LABELS,
  LOAN_STATUSES,
  type LoanStatus,
};

export const MEMBER_ACTIONS = [
  'QR',
  'Kembalikan',
  'Menunggu admin',
  'Selesai',
] as const;

export type MemberAction = (typeof MEMBER_ACTIONS)[number];

export const STATUS_MEMBER_ACTION_MAP: Record<LoanStatus, MemberAction> = {
  PENDING: 'QR',
  BORROWED: 'Kembalikan',
  OVERDUE: 'Kembalikan',
  RETURN_PENDING: 'Menunggu admin',
  FINE_PENDING: 'Menunggu admin',
  RETURNED: 'Selesai',
};

export const LOAN_MESSAGES = {
  APPLY_SUCCESS: 'Pengajuan peminjaman berhasil',
  OUT_OF_STOCK: 'Buku tidak tersedia (stok habis)',
  BOOK_NOT_FOUND: 'Buku tidak ditemukan.',
  LOAN_NOT_FOUND: 'Peminjaman tidak ditemukan.',
  INVALID_QR_CODE: 'QR Code tidak valid',
  INVALID_STATE: 'Peminjaman bukan berstatus Pending Peminjaman',
} as const;

export const createLoanInputSchema = z.object({
  book_id: z.string().regex(UUID_REGEX, { message: 'ID buku tidak valid' }),
});

export type CreateLoanInput = z.infer<typeof createLoanInputSchema>;

export const createLoanResponseDataSchema = z.object({
  id: z.string().regex(UUID_REGEX),
  loan_no: z.string(),
  status: z.literal('PENDING'),
  status_label: z.literal('Pending Peminjaman'),
});

export type CreateLoanResponseData = z.infer<
  typeof createLoanResponseDataSchema
>;

export const createLoanResponseSchema = z.object({
  data: createLoanResponseDataSchema,
  message: z.string(),
});

export type CreateLoanResponse = z.infer<typeof createLoanResponseSchema>;

export const myLoansQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export type MyLoansQuery = z.infer<typeof myLoansQuerySchema>;

export const myLoanItemSchema = z.object({
  id: z.string().regex(UUID_REGEX),
  loan_no: z.string(),
  book_id: z.string().regex(UUID_REGEX),
  book_title: z.string(),
  book_author: z.string(),
  book_cover_url: z.string().nullable(),
  requested_at: z.string(),
  due_date: z.string().nullable(),
  status: z.enum(LOAN_STATUSES),
  status_label: z.string(),
  member_action: z.enum(MEMBER_ACTIONS),
});

export type MyLoanItem = z.infer<typeof myLoanItemSchema>;

export const myLoansResponseSchema = z.object({
  data: z.array(myLoanItemSchema),
  pagination: paginationSchema,
});

export type MyLoansResponse = PaginatedResponse<MyLoanItem>;

export const MANUAL_CODE_REGEX = /^PJM-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/;

export const loanQrResponseDataSchema = z.object({
  loan_id: z.string().regex(UUID_REGEX),
  loan_no: z.string(),
  qr_token: z.string().min(1),
  manual_code: z.string().regex(MANUAL_CODE_REGEX),
});

export type LoanQrResponseData = z.infer<typeof loanQrResponseDataSchema>;

export const loanQrResponseSchema = z.object({
  data: loanQrResponseDataSchema,
});

export type LoanQrResponse = z.infer<typeof loanQrResponseSchema>;

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

export const QR_CONFIRM_SUCCESS_MESSAGE = 'Buku berhasil Dipinjam';
export const QR_INVALID_TOKEN_MESSAGE = 'QR Code tidak valid';
export const BOOK_OUT_OF_STOCK_MESSAGE = 'Buku tidak tersedia (stok habis)';

export const qrTokenInputSchema = z.object({
  qr_token: z.string().trim().min(1, { message: QR_INVALID_TOKEN_MESSAGE }),
});

export type QrTokenInput = z.infer<typeof qrTokenInputSchema>;

export const qrPreviewBookSchema = z.object({
  id: z.string().regex(UUID_REGEX),
  title: z.string(),
  author: z.string(),
  publisher: z.string(),
  publication_year: z.number().int(),
  cover_url: z.string(),
  genres: z.array(z.string()),
});

export type QrPreviewBook = z.infer<typeof qrPreviewBookSchema>;

export const qrPreviewDataSchema = z.object({
  loan_id: z.string().regex(UUID_REGEX),
  loan_no: z.string(),
  borrower_name: z.string(),
  requested_at: z.string(),
  loan_duration_days: z.number().int(),
  book: qrPreviewBookSchema,
});

export type QrPreviewData = z.infer<typeof qrPreviewDataSchema>;

export const qrPreviewResponseSchema = z.object({
  data: qrPreviewDataSchema,
});

export type QrPreviewResponse = z.infer<typeof qrPreviewResponseSchema>;

export const qrConfirmDataSchema = z.object({
  loan_id: z.string().regex(UUID_REGEX),
  status: z.literal('BORROWED'),
  status_label: z.literal('Sedang Dipinjam'),
  due_date: z.string(),
});

export type QrConfirmData = z.infer<typeof qrConfirmDataSchema>;

export const qrConfirmResponseSchema = z.object({
  data: qrConfirmDataSchema,
  message: z.string(),
});

export type QrConfirmResponse = z.infer<typeof qrConfirmResponseSchema>;

export const RATING_REQUIRED_MESSAGE = 'Rating wajib diisi';
export const RETURN_SUCCESS_MESSAGE = 'Pengembalian diajukan';

export const returnLoanInputSchema = z.object({
  score: z
    .number({ message: RATING_REQUIRED_MESSAGE })
    .int({ message: RATING_REQUIRED_MESSAGE })
    .min(RATING_MIN_SCORE, { message: RATING_REQUIRED_MESSAGE })
    .max(RATING_MAX_SCORE, { message: RATING_REQUIRED_MESSAGE }),
});

export type ReturnLoanInput = z.infer<typeof returnLoanInputSchema>;

export const returnLoanResponseDataSchema = z.object({
  loan_id: z.string().regex(UUID_REGEX),
  status: z.enum(['RETURN_PENDING', 'FINE_PENDING']),
  status_label: z.string(),
});

export type ReturnLoanResponseData = z.infer<
  typeof returnLoanResponseDataSchema
>;

export const returnLoanResponseSchema = z.object({
  data: returnLoanResponseDataSchema,
  message: z.string(),
});

export type ReturnLoanResponse = z.infer<typeof returnLoanResponseSchema>;

export const FINE_REQUIRED_MESSAGE = 'Biaya denda wajib diisi dengan angka';
export const FINE_PAYMENT_SUCCESS_MESSAGE = 'Denda Berhasil Dibayar';

export const finePaymentInputSchema = z.object({
  amount: z
    .number({ message: FINE_REQUIRED_MESSAGE })
    .int({ message: FINE_REQUIRED_MESSAGE })
    .min(1, { message: FINE_REQUIRED_MESSAGE })
    .max(FINE_MANUAL_MAX, { message: FINE_REQUIRED_MESSAGE })
    .optional(),
});

export type FinePaymentInput = z.infer<typeof finePaymentInputSchema>;

export const finePaymentResponseDataSchema = z.object({
  loan_id: z.string().regex(UUID_REGEX),
  fine_amount: z.number().int().nonnegative(),
  fine_status: z.literal('Sudah Bayar'),
});

export type FinePaymentResponseData = z.infer<
  typeof finePaymentResponseDataSchema
>;

export const finePaymentResponseSchema = z.object({
  data: finePaymentResponseDataSchema,
  message: z.string(),
});

export type FinePaymentResponse = z.infer<typeof finePaymentResponseSchema>;

export const RETURN_CONFIRM_SUCCESS_MESSAGE = 'Buku berhasil Dikembalikan';

export const returnConfirmResponseDataSchema = z.object({
  loan_id: z.string().regex(UUID_REGEX),
  status: z.literal('RETURNED'),
  status_label: z.literal('Sudah Dikembalikan'),
});

export type ReturnConfirmResponseData = z.infer<
  typeof returnConfirmResponseDataSchema
>;

export const returnConfirmResponseSchema = z.object({
  data: returnConfirmResponseDataSchema,
  message: z.string(),
});

export type ReturnConfirmResponse = z.infer<typeof returnConfirmResponseSchema>;
