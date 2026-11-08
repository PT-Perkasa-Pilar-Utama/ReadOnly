import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

export const users = pgTable(
  'users',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    fullName: text('full_name').notNull(),
    email: text('email').notNull(),
    passwordHash: text('password_hash').notNull(),
    address: text('address'),
    phoneNumber: text('phone_number').notNull(),
    role: text('role').$type<'member' | 'admin'>().notNull().default('member'),
    status: text('status')
      .$type<'active' | 'inactive'>()
      .notNull()
      .default('active'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('users_email_unique').on(table.email),
    check('users_role_check', sql`${table.role} IN ('member', 'admin')`),
    check('users_status_check', sql`${table.status} IN ('active', 'inactive')`),
  ],
);

export const sessions = pgTable(
  'sessions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('sessions_token_hash_unique').on(table.tokenHash),
    index('sessions_user_id_idx').on(table.userId),
  ],
);

export const genres = pgTable(
  'genres',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    name: text('name').notNull(),
    status: text('status')
      .$type<'active' | 'inactive'>()
      .notNull()
      .default('active'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('genres_name_normalized_unique').on(
      sql`lower(btrim(${table.name}))`,
    ),
    check(
      'genres_status_check',
      sql`${table.status} IN ('active', 'inactive')`,
    ),
  ],
);

export const userGenres = pgTable(
  'user_genres',
  {
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    genreId: uuid('genre_id')
      .notNull()
      .references(() => genres.id, { onDelete: 'restrict' }),
  },
  (table) => [
    primaryKey({
      name: 'user_genres_pkey',
      columns: [table.userId, table.genreId],
    }),
    index('user_genres_genre_id_idx').on(table.genreId),
  ],
);

export const books = pgTable(
  'books',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    title: text('title').notNull(),
    author: text('author').notNull(),
    publisher: text('publisher').notNull(),
    publicationYear: integer('publication_year').notNull(),
    synopsis: text('synopsis').notNull(),
    availableCount: integer('available_count').notNull().default(0),
    coverPath: text('cover_path'),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    check('books_available_count_check', sql`${table.availableCount} >= 0`),
    index('books_deleted_created_idx').on(table.deletedAt, table.createdAt),
  ],
);

export const bookGenres = pgTable(
  'book_genres',
  {
    bookId: uuid('book_id')
      .notNull()
      .references(() => books.id, { onDelete: 'cascade' }),
    genreId: uuid('genre_id')
      .notNull()
      .references(() => genres.id, { onDelete: 'restrict' }),
  },
  (table) => [
    primaryKey({
      name: 'book_genres_pkey',
      columns: [table.bookId, table.genreId],
    }),
    index('book_genres_genre_id_idx').on(table.genreId),
  ],
);

export const loans = pgTable(
  'loans',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    loanNo: text('loan_no').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'restrict' }),
    bookId: uuid('book_id')
      .notNull()
      .references(() => books.id, { onDelete: 'restrict' }),
    status: text('status')
      .$type<
        | 'PENDING'
        | 'BORROWED'
        | 'OVERDUE'
        | 'RETURN_PENDING'
        | 'FINE_PENDING'
        | 'RETURNED'
      >()
      .notNull()
      .default('PENDING'),
    requestedAt: timestamp('requested_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
    confirmedBy: uuid('confirmed_by').references(() => users.id),
    dueDate: date('due_date', { mode: 'string' }),
    returnRequestedAt: timestamp('return_requested_at', { withTimezone: true }),
    returnedAt: timestamp('returned_at', { withTimezone: true }),
    returnConfirmedBy: uuid('return_confirmed_by').references(() => users.id),
    lateDays: integer('late_days').notNull().default(0),
    fineAmount: integer('fine_amount'),
    fineStatus: text('fine_status')
      .$type<'Belum Bayar' | 'Sudah Bayar'>()
      .notNull()
      .default('Belum Bayar'),
    finePaidAt: timestamp('fine_paid_at', { withTimezone: true }),
    finePaidBy: uuid('fine_paid_by').references(() => users.id),
    qrTokenHash: text('qr_token_hash'),
    qrConsumedAt: timestamp('qr_consumed_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('loans_loan_no_unique').on(table.loanNo),
    index('loans_user_id_idx').on(table.userId),
    index('loans_book_id_idx').on(table.bookId),
    index('loans_status_idx').on(table.status),
    check(
      'loans_status_check',
      sql`${table.status} IN ('PENDING', 'BORROWED', 'OVERDUE', 'RETURN_PENDING', 'FINE_PENDING', 'RETURNED')`,
    ),
    check(
      'loans_fine_status_check',
      sql`${table.fineStatus} IN ('Belum Bayar', 'Sudah Bayar')`,
    ),
    check('loans_late_days_check', sql`${table.lateDays} >= 0`),
  ],
);

export const loanEvents = pgTable(
  'loan_events',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    loanId: uuid('loan_id')
      .notNull()
      .references(() => loans.id, { onDelete: 'cascade' }),
    fromStatus: text('from_status'),
    toStatus: text('to_status').notNull(),
    actorId: uuid('actor_id').references(() => users.id),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [index('loan_events_loan_id_idx').on(table.loanId)],
);

export const ratings = pgTable(
  'ratings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    loanId: uuid('loan_id')
      .notNull()
      .references(() => loans.id, { onDelete: 'cascade' }),
    bookId: uuid('book_id')
      .notNull()
      .references(() => books.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    score: integer('score').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('ratings_loan_id_unique').on(table.loanId),
    index('ratings_book_id_idx').on(table.bookId),
    check(
      'ratings_score_check',
      sql`${table.score} >= 1 AND ${table.score} <= 5`,
    ),
  ],
);

export const notifications = pgTable(
  'notifications',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    loanId: uuid('loan_id')
      .notNull()
      .references(() => loans.id, { onDelete: 'cascade' }),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text('type')
      .$type<'DUE_SOON_3D' | 'DUE_TODAY' | 'OVERDUE'>()
      .notNull(),
    title: text('title').notNull(),
    text: text('text').notNull(),
    isRead: boolean('is_read').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => [
    uniqueIndex('notifications_loan_id_type_unique').on(
      table.loanId,
      table.type,
    ),
    index('notifications_user_id_idx').on(table.userId),
    check(
      'notifications_type_check',
      sql`${table.type} IN ('DUE_SOON_3D', 'DUE_TODAY', 'OVERDUE')`,
    ),
  ],
);

export const jobRuns = pgTable(
  'job_runs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    jobName: text('job_name')
      .$type<'status_overdue' | 'notifications'>()
      .notNull(),
    startedAt: timestamp('started_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    finishedAt: timestamp('finished_at', { withTimezone: true }),
    rowsAffected: integer('rows_affected'),
  },
  (table) => [
    check(
      'job_runs_job_name_check',
      sql`${table.jobName} IN ('status_overdue', 'notifications')`,
    ),
  ],
);

export type UserRow = typeof users.$inferSelect;
export type NewUserRow = typeof users.$inferInsert;
export type SessionRow = typeof sessions.$inferSelect;
export type NewSessionRow = typeof sessions.$inferInsert;
export type GenreRow = typeof genres.$inferSelect;
export type NewGenreRow = typeof genres.$inferInsert;
export type BookRow = typeof books.$inferSelect;
export type NewBookRow = typeof books.$inferInsert;
export type LoanRow = typeof loans.$inferSelect;
export type NewLoanRow = typeof loans.$inferInsert;
export type LoanEventRow = typeof loanEvents.$inferSelect;
export type NewLoanEventRow = typeof loanEvents.$inferInsert;
export type RatingRow = typeof ratings.$inferSelect;
export type NewRatingRow = typeof ratings.$inferInsert;
export type NotificationRow = typeof notifications.$inferSelect;
export type NewNotificationRow = typeof notifications.$inferInsert;
export type JobRunRow = typeof jobRuns.$inferSelect;
export type NewJobRunRow = typeof jobRuns.$inferInsert;
