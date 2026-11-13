import { describe, expect, it } from 'bun:test';
import { getTableConfig } from 'drizzle-orm/pg-core';
import {
  addDaysWibDateString,
  bookGenres,
  books,
  formatIndonesianDate,
  genres,
  hashPassword,
  jobRuns,
  loanEvents,
  loans,
  MIGRATIONS_FOLDER,
  notifications,
  QA_EXPECTED_DASHBOARD_SUMMARY,
  QA_IDS,
  QA_PENDING_QR_TOKEN,
  ratings,
  sessions,
  sha256Hex,
  userGenres,
  users,
} from './index';

describe('@readonly/db schema and seed utilities', () => {
  it('defines all 11 canonical tables with expected snake_case table names', () => {
    const tables = [
      users,
      sessions,
      genres,
      userGenres,
      books,
      bookGenres,
      loans,
      loanEvents,
      ratings,
      notifications,
      jobRuns,
    ];

    const names = tables.map((table) => getTableConfig(table).name);
    expect(names).toEqual([
      'users',
      'sessions',
      'genres',
      'user_genres',
      'books',
      'book_genres',
      'loans',
      'loan_events',
      'ratings',
      'notifications',
      'job_runs',
    ]);
  });

  it('includes status columns on users and genres and canonical loan columns', () => {
    const userColumns = getTableConfig(users).columns.map((col) => col.name);
    expect(userColumns).toContain('status');
    expect(userColumns).toContain('role');
    expect(userColumns).toContain('phone_number');

    const genreColumns = getTableConfig(genres).columns.map((col) => col.name);
    expect(genreColumns).toContain('status');

    const loanColumns = getTableConfig(loans).columns.map((col) => col.name);
    expect(loanColumns).toEqual([
      'id',
      'loan_no',
      'user_id',
      'book_id',
      'status',
      'requested_at',
      'confirmed_at',
      'confirmed_by',
      'due_date',
      'return_requested_at',
      'returned_at',
      'return_confirmed_by',
      'late_days',
      'fine_amount',
      'fine_status',
      'fine_paid_at',
      'fine_paid_by',
      'qr_token_hash',
      'manual_code_hash',
      'qr_consumed_at',
    ]);
  });

  it('enforces RESTRICT foreign key on book_genres.genre_id and user_genres.genre_id for AC-11.09', () => {
    const bookGenreFks = getTableConfig(bookGenres).foreignKeys;
    const genreFkOnBook = bookGenreFks.find((fk) =>
      fk.reference().columns.some((col) => col.name === 'genre_id'),
    );
    expect(genreFkOnBook?.onDelete).toBe('restrict');

    const userGenreFks = getTableConfig(userGenres).foreignKeys;
    const genreFkOnUser = userGenreFks.find((fk) =>
      fk.reference().columns.some((col) => col.name === 'genre_id'),
    );
    expect(genreFkOnUser?.onDelete).toBe('restrict');
  });

  it('provides expected QA dashboard summary constants matching 06-database-reset.md', () => {
    expect(QA_EXPECTED_DASHBOARD_SUMMARY).toEqual({
      totalBooks: 12,
      totalAvailability: 8,
      borrowedCount: 2,
      overdueCount: 6,
      returnedCount: 2,
      pieChart: {
        onTime: 1,
        late: 1,
      },
    });
    expect(Object.keys(QA_IDS.books)).toHaveLength(12);
    expect(Object.keys(QA_IDS.loans)).toHaveLength(11);
  });

  it('computes WIB dates, Indonesian date formatting, SHA-256 QR token hashes, and bcrypt hashes', async () => {
    const baseUtc = new Date('2026-11-09T03:00:00.000Z'); // 10:00 WIB on 2026-11-09
    expect(addDaysWibDateString(baseUtc, 0)).toBe('2026-11-09');
    expect(addDaysWibDateString(baseUtc, 7)).toBe('2026-11-16');
    expect(formatIndonesianDate('2026-11-16')).toBe('16 November 2026');

    const tokenHash = sha256Hex(QA_PENDING_QR_TOKEN);
    expect(tokenHash).toHaveLength(64);

    const passwordHash = await hashPassword('devadmin123!', 4);
    expect(await Bun.password.verify('devadmin123!', passwordHash)).toBe(true);
    expect(MIGRATIONS_FOLDER).toContain('drizzle');
  });
});
