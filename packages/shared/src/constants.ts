export const USER_ROLES = ['member', 'admin'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  member: 'Member',
  admin: 'Admin Perpus',
};

export const USER_STATUSES = ['active', 'inactive'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

export const USER_STATUS_LABELS: Record<UserStatus, string> = {
  active: 'Aktif',
  inactive: 'Nonaktif',
};

export const GENRE_STATUSES = ['active', 'inactive'] as const;
export type GenreStatus = (typeof GENRE_STATUSES)[number];

export const GENRE_STATUS_LABELS: Record<GenreStatus, string> = {
  active: 'Aktif',
  inactive: 'Nonaktif',
};

export const LOAN_STATUSES = [
  'PENDING',
  'BORROWED',
  'OVERDUE',
  'RETURN_PENDING',
  'FINE_PENDING',
  'RETURNED',
] as const;

export type LoanStatus = (typeof LOAN_STATUSES)[number];

export const LOAN_STATUS_LABELS: Record<LoanStatus, string> = {
  PENDING: 'Pending Peminjaman',
  BORROWED: 'Sedang Dipinjam',
  OVERDUE: 'Terlambat',
  RETURN_PENDING: 'Pending Pengembalian',
  FINE_PENDING: 'Pending Keterlambatan',
  RETURNED: 'Sudah Dikembalikan',
};

export const FINE_STATUSES = ['Belum Bayar', 'Sudah Bayar'] as const;
export type FineStatus = (typeof FINE_STATUSES)[number];

export const NOTIFICATION_TYPES = [
  'DUE_SOON_3D',
  'DUE_TODAY',
  'OVERDUE',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const JOB_NAMES = ['status_overdue', 'notifications'] as const;
export type JobName = (typeof JOB_NAMES)[number];

export const LOAN_DURATION_DAYS = 7;
export const REMINDER_DAYS_BEFORE_DUE = 3;
export const FINE_PER_DAY_AUTO = 2000;
export const FINE_FLAT_AMOUNT = 2000;
export const FINE_AUTO_MAX_DAYS = 4;
export const FINE_MANUAL_MIN_DAYS = 5;
export const FINE_MANUAL_MAX = 99_999_999;

export const MAX_COVER_SIZE_BYTES = 5 * 1024 * 1024;
export const ALLOWED_COVER_EXTENSIONS = ['.png', '.jpg', '.jpeg'] as const;
export const ALLOWED_COVER_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/jpg',
] as const;

export const RATING_MIN_SCORE = 1;
export const RATING_MAX_SCORE = 5;

export const LOGIN_POPUP_DURATION_MS = 3000;
export const LOGIN_POPUP_CONDITION_ORDER = [
  'OVERDUE',
  'DUE_TODAY',
  'DUE_SOON',
] as const;
export type LoginPopupCondition = (typeof LOGIN_POPUP_CONDITION_ORDER)[number];

export function calculateFine(lateDays: number): number | null {
  if (lateDays <= 0) {
    return 0;
  }

  if (lateDays <= FINE_AUTO_MAX_DAYS) {
    return FINE_FLAT_AMOUNT;
  }

  return null;
}
