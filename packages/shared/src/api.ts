import { z } from 'zod';

export const apiErrorEnvelopeSchema = z.object({
  statusCode: z.number().int().min(100).max(599),
  error: z.string().min(1),
  code: z.string().min(1),
  message: z.string().min(1),
  data: z.record(z.string(), z.unknown()).optional(),
});

export type ApiErrorEnvelope = z.infer<typeof apiErrorEnvelopeSchema>;

export interface ApiSuccessEnvelope<T> {
  data: T;
  message?: string;
}

export const paginationSchema = z.object({
  page: z.number().int().positive(),
  limit: z.number().int().positive().max(50),
  total: z.number().int().nonnegative(),
  totalPages: z.number().int().nonnegative(),
});

export type Pagination = z.infer<typeof paginationSchema>;

export interface PaginatedResponse<T> {
  data: T[];
  pagination: Pagination;
}
