import { z } from 'zod';
import { paginationSchema } from './api';
import { UUID_REGEX } from './auth';
import {
  LOGIN_POPUP_CONDITION_ORDER,
  LOGIN_POPUP_DURATION_MS,
  type LoginPopupCondition,
  NOTIFICATION_TYPES,
  type NotificationType,
} from './constants';

export {
  LOGIN_POPUP_CONDITION_ORDER,
  LOGIN_POPUP_DURATION_MS,
  type LoginPopupCondition,
  NOTIFICATION_TYPES,
  type NotificationType,
};

export const notificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export type NotificationsQuery = z.infer<typeof notificationsQuerySchema>;

export const notificationItemSchema = z.object({
  id: z.string().regex(UUID_REGEX),
  loan_id: z.string().regex(UUID_REGEX),
  type: z.enum(NOTIFICATION_TYPES),
  title: z.string(),
  text: z.string(),
  book_title: z.string(),
  due_date: z.string(),
  created_at: z.string(),
});

export type NotificationItem = z.infer<typeof notificationItemSchema>;

export const loginPopupOverdueBookSchema = z.object({
  loan_id: z.string().regex(UUID_REGEX),
  book_title: z.string(),
  due_date: z.string(),
  late_days: z.number().int().nonnegative(),
  message: z.string(),
});

export type LoginPopupOverdueBook = z.infer<typeof loginPopupOverdueBookSchema>;

export const loginPopupDueTodayBookSchema = z.object({
  loan_id: z.string().regex(UUID_REGEX),
  book_title: z.string(),
  due_date: z.string(),
  message: z.string(),
});

export type LoginPopupDueTodayBook = z.infer<
  typeof loginPopupDueTodayBookSchema
>;

export const loginPopupDueSoonBookSchema = z.object({
  loan_id: z.string().regex(UUID_REGEX),
  book_title: z.string(),
  due_date: z.string(),
  remaining_days: z.number().int().positive(),
  message: z.string(),
});

export type LoginPopupDueSoonBook = z.infer<typeof loginPopupDueSoonBookSchema>;

export const loginPopupItemSchema = z.discriminatedUnion('condition', [
  z.object({
    condition: z.literal('OVERDUE'),
    books: z.array(loginPopupOverdueBookSchema),
  }),
  z.object({
    condition: z.literal('DUE_TODAY'),
    books: z.array(loginPopupDueTodayBookSchema),
  }),
  z.object({
    condition: z.literal('DUE_SOON'),
    books: z.array(loginPopupDueSoonBookSchema),
  }),
]);

export type LoginPopupItem = z.infer<typeof loginPopupItemSchema>;

export const notificationsResponseSchema = z.object({
  data: z.array(notificationItemSchema),
  login_popups: z.array(loginPopupItemSchema),
  pagination: paginationSchema,
});

export type NotificationsResponse = z.infer<typeof notificationsResponseSchema>;
