import { createHash } from 'node:crypto';
import type { Database } from '../client';
import {
  bookGenres,
  books,
  genres,
  loanEvents,
  loans,
  notifications,
  ratings,
  sessions,
  userGenres,
  users,
} from '../schema';

export interface SeedClock {
  now(): Date;
}

export interface SeedOptions {
  clock?: SeedClock;
  adminEmail?: string;
  adminPassword?: string;
  bcryptRounds?: number;
}

export interface SeedCounts {
  users: number;
  genres: number;
  books: number;
  loans: number;
  notifications: number;
  ratings: number;
}

export const QA_IDS = {
  users: {
    admin: '00000000-0000-4000-8000-000000000001',
    member1: '00000000-0000-4000-8000-000000000002',
    member2: '00000000-0000-4000-8000-000000000003',
    inactiveMember: '00000000-0000-4000-8000-000000000004',
  },
  genres: {
    fiksi: '00000000-0000-4000-8001-000000000001',
    teknologi: '00000000-0000-4000-8001-000000000002',
    sejarah: '00000000-0000-4000-8001-000000000003',
    bisnis: '00000000-0000-4000-8001-000000000004',
    sains: '00000000-0000-4000-8001-000000000005',
    unused: '00000000-0000-4000-8001-000000000006',
    inactive: '00000000-0000-8001-8001-000000000007',
  },
  books: {
    bookA: '00000000-0000-4000-8002-000000000001',
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
    bookEmpty: '00000000-0000-4000-8002-000000000012',
  },
  loans: {
    pending: '00000000-0000-4000-8003-000000000001',
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
  },
} as const;

export const QA_PENDING_QR_TOKEN = 'qa-seed-pending-qr-token-128bit-0001';
export const QA_PENDING_MANUAL_CODE = 'PJM-QA2345';

export function sha256Hex(input: string): string {
  return createHash('sha256').update(input).digest('hex');
}

export async function hashPassword(
  password: string,
  cost = 10,
): Promise<string> {
  return Bun.password.hash(password, { algorithm: 'bcrypt', cost });
}

const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export function addDaysWibDateString(
  baseDate: Date,
  daysOffset: number,
): string {
  const wibTime = new Date(
    baseDate.getTime() + WIB_OFFSET_MS + daysOffset * DAY_MS,
  );
  return wibTime.toISOString().slice(0, 10);
}

const INDONESIAN_MONTHS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
] as const;

export function formatIndonesianDate(isoDateString: string): string {
  const [year, month, day] = isoDateString.split('-').map(Number);
  const monthName = INDONESIAN_MONTHS[(month ?? 1) - 1] ?? 'Januari';
  return `${day} ${monthName} ${year}`;
}

export async function clearAllTables(db: Database): Promise<void> {
  await db.delete(notifications);
  await db.delete(ratings);
  await db.delete(loanEvents);
  await db.delete(loans);
  await db.delete(bookGenres);
  await db.delete(userGenres);
  await db.delete(sessions);
  await db.delete(books);
  await db.delete(genres);
  await db.delete(users);
}
