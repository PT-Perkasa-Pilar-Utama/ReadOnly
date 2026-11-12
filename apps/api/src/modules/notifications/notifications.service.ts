import {
  addDaysToWibDateString,
  formatIndonesianDate,
  getWibDateString,
  getWibDaysDifference,
  type LoginPopupDueSoonBook,
  type LoginPopupDueTodayBook,
  type LoginPopupItem,
  type LoginPopupOverdueBook,
  type NotificationItem,
  type NotificationsQuery,
  type NotificationsResponse,
} from '@readonly/shared';
import { type ClockPort, SystemClock } from '../../ports/clock';
import type {
  CreateNotificationRecord,
  NotificationsRepository,
} from './notifications.repository';

export interface NotificationsServiceOptions {
  repository: NotificationsRepository;
  clock?: ClockPort | undefined;
}

export class NotificationsService {
  private readonly repository: NotificationsRepository;
  private readonly clock: ClockPort;

  constructor(options: NotificationsServiceOptions) {
    this.repository = options.repository;
    this.clock = options.clock ?? new SystemClock();
  }

  getClock(): ClockPort {
    return this.clock;
  }

  getRepository(): NotificationsRepository {
    return this.repository;
  }

  async getNotifications(
    userId: string,
    query: NotificationsQuery,
  ): Promise<NotificationsResponse> {
    const { items, total } = await this.repository.listByUserId(
      userId,
      query.page,
      query.limit,
    );

    const totalPages = total === 0 ? 0 : Math.ceil(total / query.limit);

    const data: NotificationItem[] = items.map((item) => ({
      id: item.id,
      loan_id: item.loanId,
      type: item.type,
      title: item.title,
      text: item.text,
      book_title: item.bookTitle,
      due_date: item.dueDate,
      created_at: item.createdAt.toISOString(),
    }));

    const now = this.clock.now();
    const todayWib = getWibDateString(now);

    const activeLoans = await this.repository.findActiveLoansForPopups(userId);

    const overdueBooks: LoginPopupOverdueBook[] = [];
    const dueTodayBooks: LoginPopupDueTodayBook[] = [];
    const dueSoonBooks: LoginPopupDueSoonBook[] = [];

    for (const loan of activeLoans) {
      if (loan.status === 'OVERDUE') {
        const rawDiff = getWibDaysDifference(loan.dueDate, todayWib);
        const lateDays = Math.max(
          1,
          loan.lateDays > 0 ? loan.lateDays : rawDiff,
        );
        overdueBooks.push({
          loan_id: loan.loanId,
          book_title: loan.bookTitle,
          due_date: loan.dueDate,
          late_days: lateDays,
          message: `${loan.bookTitle} terlambat ${lateDays} hari. Segera ajukan pengembalian.`,
        });
      } else if (loan.status === 'BORROWED') {
        if (loan.dueDate === todayWib) {
          dueTodayBooks.push({
            loan_id: loan.loanId,
            book_title: loan.bookTitle,
            due_date: loan.dueDate,
            message: `${loan.bookTitle} jatuh tempo hari ini. Silakan dikembalikan.`,
          });
        } else {
          const remainingDays = getWibDaysDifference(todayWib, loan.dueDate);
          if (remainingDays >= 1 && remainingDays <= 3) {
            dueSoonBooks.push({
              loan_id: loan.loanId,
              book_title: loan.bookTitle,
              due_date: loan.dueDate,
              remaining_days: remainingDays,
              message: `Batas pengembalian ${remainingDays} hari lagi`,
            });
          }
        }
      }
    }

    const loginPopups: LoginPopupItem[] = [];

    // AC-10.07 Priority ordering: OVERDUE -> DUE_TODAY -> DUE_SOON
    if (overdueBooks.length > 0) {
      loginPopups.push({
        condition: 'OVERDUE',
        books: overdueBooks,
      });
    }

    if (dueTodayBooks.length > 0) {
      loginPopups.push({
        condition: 'DUE_TODAY',
        books: dueTodayBooks,
      });
    }

    if (dueSoonBooks.length > 0) {
      loginPopups.push({
        condition: 'DUE_SOON',
        books: dueSoonBooks,
      });
    }

    return {
      data,
      login_popups: loginPopups,
      pagination: {
        page: query.page,
        limit: query.limit,
        total,
        totalPages,
      },
    };
  }

  async createDailyNotifications(now: Date): Promise<number> {
    const todayWib = getWibDateString(now);
    const dueSoonDate = addDaysToWibDateString(todayWib, 3);

    const itemsToCreate: CreateNotificationRecord[] = [];

    // 1. DUE_SOON_3D: loans where status = 'BORROWED' and dueDate = todayWib + 3 days
    const dueSoonCandidates =
      await this.repository.findDueSoonCandidates(dueSoonDate);
    for (const loan of dueSoonCandidates) {
      itemsToCreate.push({
        userId: loan.userId,
        loanId: loan.loanId,
        type: 'DUE_SOON_3D',
        title: 'Batas pengembalian 3 hari lagi',
        text: `${loan.bookTitle} perlu dikembalikan paling lambat ${formatIndonesianDate(loan.dueDate)}.`,
        createdAt: now,
      });
    }

    // 2. DUE_TODAY: loans where status = 'BORROWED' and dueDate = todayWib
    const dueTodayCandidates =
      await this.repository.findDueTodayCandidates(todayWib);
    for (const loan of dueTodayCandidates) {
      itemsToCreate.push({
        userId: loan.userId,
        loanId: loan.loanId,
        type: 'DUE_TODAY',
        title: `${loan.bookTitle} sudah mencapai tenggat waktu peminjaman. Silahkan Dikembalikan`,
        text: `${loan.bookTitle} sudah mencapai tenggat waktu peminjaman. Silahkan Dikembalikan`,
        createdAt: now,
      });
    }

    // 3. OVERDUE: loans where status = 'OVERDUE'
    const overdueCandidates =
      await this.repository.findOverdueCandidatesForNotification();
    for (const loan of overdueCandidates) {
      itemsToCreate.push({
        userId: loan.userId,
        loanId: loan.loanId,
        type: 'OVERDUE',
        title: 'Buku melewati batas pengembalian',
        text: `${loan.bookTitle} jatuh tempo pada ${formatIndonesianDate(loan.dueDate)}. Segera ajukan pengembalian.`,
        createdAt: now,
      });
    }

    return await this.repository.createNotifications(itemsToCreate);
  }
}
