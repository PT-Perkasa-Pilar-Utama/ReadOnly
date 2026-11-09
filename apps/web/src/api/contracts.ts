import {
  LOGIN_POPUP_CONDITION_ORDER,
  NOTIFICATION_TYPES,
  paginationSchema,
  USER_ROLES,
  USER_STATUSES,
} from '@readonly/shared';
import { z } from 'zod';

export const profileSchema = z.object({
  id: z.string(),
  full_name: z.string(),
  email: z.string(),
  role: z.enum(USER_ROLES),
});
export type Profile = z.infer<typeof profileSchema>;
export const userSchema = profileSchema.extend({
  phone_number: z.string(),
  status: z.enum(USER_STATUSES),
});
export const userDetailSchema = userSchema.extend({
  address: z.string().nullable(),
});
export type User = z.infer<typeof userSchema>;
export type UserDetail = z.infer<typeof userDetailSchema>;
export const registrationSchema = z.object({
  full_name: z.string(),
  email: z.string(),
  address: z.string(),
  phone_number: z.string(),
  password: z.string(),
  confirm_password: z.string(),
});
export type Registration = z.infer<typeof registrationSchema>;
export type AdminInput = Omit<Registration, 'address'>;
export type UserEdit = Pick<Registration, 'full_name' | 'phone_number'> & {
  address?: string;
};
export const genreSchema = z.object({ id: z.string(), name: z.string() });
export type Genre = z.infer<typeof genreSchema>;
export const bookSchema = z.object({
  id: z.string(),
  title: z.string(),
  author: z.string(),
  publisher: z.string(),
  publication_year: z.number(),
  cover_url: z.string(),
  genres: z.array(genreSchema.extend({ status: z.enum(USER_STATUSES) })),
  available_count: z.number().int().nonnegative(),
  is_available: z.boolean(),
  availability_label: z.enum(['Tersedia', 'Tidak Tersedia']),
  average_rating: z.number().nullable(),
});
export const bookDetailSchema = bookSchema.extend({ synopsis: z.string() });
export type Book = z.infer<typeof bookSchema>;
export type BookDetail = z.infer<typeof bookDetailSchema>;
export const catalogSchema = z.object({
  data: z.array(bookSchema),
  recommendations: z.array(bookSchema),
  authors: z.array(z.string()),
  pagination: paginationSchema,
});
export const userListSchema = z.object({
  data: z.array(userSchema),
  pagination: paginationSchema,
});
export const notificationSchema = z.object({
  id: z.string(),
  loan_id: z.string(),
  type: z.enum(NOTIFICATION_TYPES),
  title: z.string(),
  text: z.string(),
  book_title: z.string(),
  due_date: z.string(),
  created_at: z.string(),
});
export const popupSchema = z.object({
  condition: z.enum(LOGIN_POPUP_CONDITION_ORDER),
  books: z.array(
    z.object({
      loan_id: z.string(),
      book_title: z.string(),
      due_date: z.string(),
      late_days: z.number().optional(),
      remaining_days: z.number().optional(),
      message: z.string(),
    }),
  ),
});
export type Popup = z.infer<typeof popupSchema>;
export const notificationsSchema = z.object({
  data: z.array(notificationSchema),
  login_popups: z.array(popupSchema),
  pagination: paginationSchema,
});
export function envelope<T extends z.ZodType>(data: T) {
  return z.object({ data, message: z.string().optional() });
}
