import { books, type Database, loans, notifications } from '@readonly/db';
import type { LoanStatus, NotificationType } from '@readonly/shared';
import { and, asc, count, desc, eq, inArray } from 'drizzle-orm';
import type { InMemoryLoansRepository } from '../loans/loans.repository';

export interface NotificationRecord {
  id: string;
  loanId: string;
  userId: string;
  type: NotificationType;
  title: string;
  text: string;
  isRead: boolean;
  createdAt: Date;
  bookTitle: string;
  dueDate: string;
}

export interface ActiveLoanPopupRecord {
  loanId: string;
  userId: string;
  bookTitle: string;
  status: LoanStatus;
  dueDate: string;
  lateDays: number;
}

export interface DueNotificationCandidate {
  loanId: string;
  userId: string;
  bookTitle: string;
  dueDate: string;
  status: LoanStatus;
}

export interface CreateNotificationRecord {
  loanId: string;
  userId: string;
  type: NotificationType;
  title: string;
  text: string;
  createdAt: Date;
}

export interface NotificationsRepository {
  listByUserId(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ items: NotificationRecord[]; total: number }>;

  findActiveLoansForPopups(userId: string): Promise<ActiveLoanPopupRecord[]>;

  findDueSoonCandidates(
    targetDueDate: string,
  ): Promise<DueNotificationCandidate[]>;
  findDueTodayCandidates(todayWib: string): Promise<DueNotificationCandidate[]>;
  findOverdueCandidatesForNotification(): Promise<DueNotificationCandidate[]>;

  createNotifications(items: CreateNotificationRecord[]): Promise<number>;
}

export class DrizzleNotificationsRepository implements NotificationsRepository {
  constructor(private readonly db: Database) {}

  async listByUserId(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ items: NotificationRecord[]; total: number }> {
    const offset = (page - 1) * limit;

    const [totalRow] = await this.db
      .select({ count: count() })
      .from(notifications)
      .where(eq(notifications.userId, userId));

    const total = totalRow?.count ?? 0;

    const rows = await this.db
      .select({
        id: notifications.id,
        loanId: notifications.loanId,
        userId: notifications.userId,
        type: notifications.type,
        title: notifications.title,
        text: notifications.text,
        isRead: notifications.isRead,
        createdAt: notifications.createdAt,
        bookTitle: books.title,
        dueDate: loans.dueDate,
      })
      .from(notifications)
      .innerJoin(loans, eq(notifications.loanId, loans.id))
      .innerJoin(books, eq(loans.bookId, books.id))
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);

    const items: NotificationRecord[] = rows.map((r) => ({
      id: r.id,
      loanId: r.loanId,
      userId: r.userId,
      type: r.type,
      title: r.title,
      text: r.text,
      isRead: r.isRead,
      createdAt: r.createdAt,
      bookTitle: r.bookTitle,
      dueDate: r.dueDate ?? '',
    }));

    return { items, total };
  }

  async findActiveLoansForPopups(
    userId: string,
  ): Promise<ActiveLoanPopupRecord[]> {
    const rows = await this.db
      .select({
        loanId: loans.id,
        userId: loans.userId,
        bookTitle: books.title,
        status: loans.status,
        dueDate: loans.dueDate,
        lateDays: loans.lateDays,
      })
      .from(loans)
      .innerJoin(books, eq(loans.bookId, books.id))
      .where(
        and(
          eq(loans.userId, userId),
          inArray(loans.status, ['BORROWED', 'OVERDUE']),
        ),
      )
      .orderBy(asc(loans.dueDate));

    return rows.map((r) => ({
      loanId: r.loanId,
      userId: r.userId,
      bookTitle: r.bookTitle,
      status: r.status,
      dueDate: r.dueDate ?? '',
      lateDays: r.lateDays,
    }));
  }

  async findDueSoonCandidates(
    targetDueDate: string,
  ): Promise<DueNotificationCandidate[]> {
    const rows = await this.db
      .select({
        loanId: loans.id,
        userId: loans.userId,
        bookTitle: books.title,
        dueDate: loans.dueDate,
        status: loans.status,
      })
      .from(loans)
      .innerJoin(books, eq(loans.bookId, books.id))
      .where(
        and(eq(loans.status, 'BORROWED'), eq(loans.dueDate, targetDueDate)),
      );

    return rows.map((r) => ({
      loanId: r.loanId,
      userId: r.userId,
      bookTitle: r.bookTitle,
      dueDate: r.dueDate ?? '',
      status: r.status,
    }));
  }

  async findDueTodayCandidates(
    todayWib: string,
  ): Promise<DueNotificationCandidate[]> {
    const rows = await this.db
      .select({
        loanId: loans.id,
        userId: loans.userId,
        bookTitle: books.title,
        dueDate: loans.dueDate,
        status: loans.status,
      })
      .from(loans)
      .innerJoin(books, eq(loans.bookId, books.id))
      .where(and(eq(loans.status, 'BORROWED'), eq(loans.dueDate, todayWib)));

    return rows.map((r) => ({
      loanId: r.loanId,
      userId: r.userId,
      bookTitle: r.bookTitle,
      dueDate: r.dueDate ?? '',
      status: r.status,
    }));
  }

  async findOverdueCandidatesForNotification(): Promise<
    DueNotificationCandidate[]
  > {
    const rows = await this.db
      .select({
        loanId: loans.id,
        userId: loans.userId,
        bookTitle: books.title,
        dueDate: loans.dueDate,
        status: loans.status,
      })
      .from(loans)
      .innerJoin(books, eq(loans.bookId, books.id))
      .where(eq(loans.status, 'OVERDUE'));

    return rows.map((r) => ({
      loanId: r.loanId,
      userId: r.userId,
      bookTitle: r.bookTitle,
      dueDate: r.dueDate ?? '',
      status: r.status,
    }));
  }

  async createNotifications(
    items: CreateNotificationRecord[],
  ): Promise<number> {
    if (items.length === 0) {
      return 0;
    }

    const inserted = await this.db
      .insert(notifications)
      .values(
        items.map((item) => ({
          userId: item.userId,
          loanId: item.loanId,
          type: item.type,
          title: item.title,
          text: item.text,
          isRead: false,
          createdAt: item.createdAt,
        })),
      )
      .onConflictDoNothing()
      .returning({ id: notifications.id });

    return inserted.length;
  }
}

export interface InMemoryStoredNotification {
  id: string;
  loanId: string;
  userId: string;
  type: NotificationType;
  title: string;
  text: string;
  isRead: boolean;
  createdAt: Date;
  bookTitle?: string;
  dueDate?: string;
}

export interface InMemoryPopupLoanInput {
  loanId: string;
  userId: string;
  bookTitle: string;
  status: LoanStatus;
  dueDate: string;
  lateDays?: number;
}

export class InMemoryNotificationsRepository
  implements NotificationsRepository
{
  private readonly notifications: InMemoryStoredNotification[] = [];
  private readonly loans: InMemoryPopupLoanInput[] = [];

  constructor(private readonly loansRepo?: InMemoryLoansRepository) {}

  addLoan(loan: InMemoryPopupLoanInput): void {
    this.loans.push(loan);
  }

  addNotification(notif: InMemoryStoredNotification): void {
    const exists = this.notifications.some(
      (n) => n.loanId === notif.loanId && n.type === notif.type,
    );
    if (!exists) {
      this.notifications.push(notif);
    }
  }

  getNotifications(): readonly InMemoryStoredNotification[] {
    return this.notifications;
  }

  async listByUserId(
    userId: string,
    page: number,
    limit: number,
  ): Promise<{ items: NotificationRecord[]; total: number }> {
    // Combine notifications from this repo and loansRepo (if present)
    const combined: InMemoryStoredNotification[] = [...this.notifications];

    if (this.loansRepo) {
      const loanNotifs = this.loansRepo.getNotifications();
      for (const ln of loanNotifs) {
        if (
          !combined.some((c) => c.loanId === ln.loanId && c.type === ln.type)
        ) {
          combined.push({
            id: ln.id,
            loanId: ln.loanId,
            userId: ln.userId,
            type: ln.type,
            title: ln.title,
            text: ln.text,
            isRead: ln.isRead,
            createdAt: ln.createdAt,
          });
        }
      }
    }

    const userNotifs = combined.filter((n) => n.userId === userId);
    userNotifs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const total = userNotifs.length;
    const offset = (page - 1) * limit;
    const paged = userNotifs.slice(offset, offset + limit);

    const items: NotificationRecord[] = paged.map((n) => {
      let bookTitle = n.bookTitle ?? '';
      let dueDate = n.dueDate ?? '';

      if (this.loansRepo) {
        const loan = this.loansRepo.getLoans().find((l) => l.id === n.loanId);
        if (loan) {
          dueDate = dueDate || loan.dueDate || '';
          const book = this.loansRepo.getBook(loan.bookId);
          if (book) {
            bookTitle = bookTitle || book.title;
          }
        }
      }

      if (!bookTitle || !dueDate) {
        const directLoan = this.loans.find((l) => l.loanId === n.loanId);
        if (directLoan) {
          bookTitle = bookTitle || directLoan.bookTitle;
          dueDate = dueDate || directLoan.dueDate;
        }
      }

      return {
        id: n.id,
        loanId: n.loanId,
        userId: n.userId,
        type: n.type,
        title: n.title,
        text: n.text,
        isRead: n.isRead,
        createdAt: n.createdAt,
        bookTitle: bookTitle || 'Unknown Book',
        dueDate: dueDate || '',
      };
    });

    return { items, total };
  }

  async findActiveLoansForPopups(
    userId: string,
  ): Promise<ActiveLoanPopupRecord[]> {
    const results: ActiveLoanPopupRecord[] = [];

    if (this.loansRepo) {
      const activeLoans = this.loansRepo
        .getLoans()
        .filter(
          (l) =>
            l.userId === userId &&
            (l.status === 'BORROWED' || l.status === 'OVERDUE'),
        );

      for (const l of activeLoans) {
        const book = this.loansRepo.getBook(l.bookId);
        results.push({
          loanId: l.id,
          userId: l.userId,
          bookTitle: book?.title ?? 'Unknown Book',
          status: l.status,
          dueDate: l.dueDate ?? '',
          lateDays: l.lateDays,
        });
      }
    }

    // Also include direct loans added to this repo (for standalone testing)
    for (const dl of this.loans) {
      if (
        dl.userId === userId &&
        (dl.status === 'BORROWED' || dl.status === 'OVERDUE')
      ) {
        if (!results.some((r) => r.loanId === dl.loanId)) {
          results.push({
            loanId: dl.loanId,
            userId: dl.userId,
            bookTitle: dl.bookTitle,
            status: dl.status,
            dueDate: dl.dueDate,
            lateDays: dl.lateDays ?? 0,
          });
        }
      }
    }

    results.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
    return results;
  }

  async findDueSoonCandidates(
    targetDueDate: string,
  ): Promise<DueNotificationCandidate[]> {
    const candidates: DueNotificationCandidate[] = [];

    if (this.loansRepo) {
      const matched = this.loansRepo
        .getLoans()
        .filter((l) => l.status === 'BORROWED' && l.dueDate === targetDueDate);

      for (const l of matched) {
        const book = this.loansRepo.getBook(l.bookId);
        candidates.push({
          loanId: l.id,
          userId: l.userId,
          bookTitle: book?.title ?? 'Unknown Book',
          dueDate: l.dueDate ?? '',
          status: l.status,
        });
      }
    }

    for (const dl of this.loans) {
      if (dl.status === 'BORROWED' && dl.dueDate === targetDueDate) {
        if (!candidates.some((c) => c.loanId === dl.loanId)) {
          candidates.push({
            loanId: dl.loanId,
            userId: dl.userId,
            bookTitle: dl.bookTitle,
            dueDate: dl.dueDate,
            status: dl.status,
          });
        }
      }
    }

    return candidates;
  }

  async findDueTodayCandidates(
    todayWib: string,
  ): Promise<DueNotificationCandidate[]> {
    const candidates: DueNotificationCandidate[] = [];

    if (this.loansRepo) {
      const matched = this.loansRepo
        .getLoans()
        .filter((l) => l.status === 'BORROWED' && l.dueDate === todayWib);

      for (const l of matched) {
        const book = this.loansRepo.getBook(l.bookId);
        candidates.push({
          loanId: l.id,
          userId: l.userId,
          bookTitle: book?.title ?? 'Unknown Book',
          dueDate: l.dueDate ?? '',
          status: l.status,
        });
      }
    }

    for (const dl of this.loans) {
      if (dl.status === 'BORROWED' && dl.dueDate === todayWib) {
        if (!candidates.some((c) => c.loanId === dl.loanId)) {
          candidates.push({
            loanId: dl.loanId,
            userId: dl.userId,
            bookTitle: dl.bookTitle,
            dueDate: dl.dueDate,
            status: dl.status,
          });
        }
      }
    }

    return candidates;
  }

  async findOverdueCandidatesForNotification(): Promise<
    DueNotificationCandidate[]
  > {
    const candidates: DueNotificationCandidate[] = [];

    if (this.loansRepo) {
      const matched = this.loansRepo
        .getLoans()
        .filter((l) => l.status === 'OVERDUE');

      for (const l of matched) {
        const book = this.loansRepo.getBook(l.bookId);
        candidates.push({
          loanId: l.id,
          userId: l.userId,
          bookTitle: book?.title ?? 'Unknown Book',
          dueDate: l.dueDate ?? '',
          status: l.status,
        });
      }
    }

    for (const dl of this.loans) {
      if (dl.status === 'OVERDUE') {
        if (!candidates.some((c) => c.loanId === dl.loanId)) {
          candidates.push({
            loanId: dl.loanId,
            userId: dl.userId,
            bookTitle: dl.bookTitle,
            dueDate: dl.dueDate,
            status: dl.status,
          });
        }
      }
    }

    return candidates;
  }

  async createNotifications(
    items: CreateNotificationRecord[],
  ): Promise<number> {
    let insertedCount = 0;

    for (const item of items) {
      const exists = this.notifications.some(
        (n) => n.loanId === item.loanId && n.type === item.type,
      );

      if (!exists) {
        this.notifications.push({
          id: crypto.randomUUID(),
          loanId: item.loanId,
          userId: item.userId,
          type: item.type,
          title: item.title,
          text: item.text,
          isRead: false,
          createdAt: item.createdAt,
        });
        insertedCount++;
      }
    }

    return insertedCount;
  }
}
