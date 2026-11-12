import { books, type Database, loans } from '@readonly/db';
import type { DashboardSummaryData, LoanStatus } from '@readonly/shared';
import { isNull, sql } from 'drizzle-orm';
import type { InMemoryLoansRepository } from '../loans/loans.repository';

export type DashboardSummary = DashboardSummaryData;

export interface InMemoryDashboardBook {
  id: string;
  availableCount: number;
  deletedAt?: Date | null;
}

export interface InMemoryDashboardLoan {
  id: string;
  status: LoanStatus;
  lateDays: number;
}

export interface DashboardRepository {
  getSummary(): Promise<DashboardSummary>;
}

export class DrizzleDashboardRepository implements DashboardRepository {
  constructor(private readonly db: Database) { }

  async getSummary(): Promise<DashboardSummary> {
    const [booksRow] = await this.db
      .select({
        totalBooks: sql<number>`count(*)::int`,
        totalAvailability: sql<number>`coalesce(sum(${books.availableCount}), 0)::int`,
      })
      .from(books)
      .where(isNull(books.deletedAt));

    const [loansRow] = await this.db
      .select({
        borrowedCount: sql<number>`count(*) filter (where ${loans.status} in ('BORROWED', 'RETURN_PENDING'))::int`,
        overdueCount: sql<number>`count(*) filter (where ${loans.status} in ('OVERDUE', 'FINE_PENDING'))::int`,
        returnedCount: sql<number>`count(*) filter (where ${loans.status} = 'RETURNED')::int`,
        onTime: sql<number>`count(*) filter (where ${loans.status} = 'RETURNED' and ${loans.lateDays} = 0)::int`,
        late: sql<number>`count(*) filter (where ${loans.status} = 'RETURNED' and ${loans.lateDays} > 0)::int`,
      })
      .from(loans);

    return {
      totalBooks: Number(booksRow?.totalBooks ?? 0),
      totalAvailability: Number(booksRow?.totalAvailability ?? 0),
      borrowedCount: Number(loansRow?.borrowedCount ?? 0),
      overdueCount: Number(loansRow?.overdueCount ?? 0),
      returnedCount: Number(loansRow?.returnedCount ?? 0),
      pieChart: {
        onTime: Number(loansRow?.onTime ?? 0),
        late: Number(loansRow?.late ?? 0),
      },
    };
  }
}

export class InMemoryDashboardRepository implements DashboardRepository {
  private customSummary: DashboardSummary | null = null;
  private readonly loansRepo?: InMemoryLoansRepository | undefined;
  private booksList: InMemoryDashboardBook[] = [];
  private loansList: InMemoryDashboardLoan[] = [];

  constructor(options?: {
    loansRepo?: InMemoryLoansRepository | undefined;
    books?: InMemoryDashboardBook[] | undefined;
    loans?: InMemoryDashboardLoan[] | undefined;
  }) {
    this.loansRepo = options?.loansRepo;
    if (options?.books) {
      this.booksList = [...options.books];
    }
    if (options?.loans) {
      this.loansList = [...options.loans];
    }
  }

  setSummary(summary: DashboardSummary): void {
    this.customSummary = summary;
  }

  setBooks(books: InMemoryDashboardBook[]): void {
    this.booksList = [...books];
  }

  setLoans(loans: InMemoryDashboardLoan[]): void {
    this.loansList = [...loans];
  }

  async getSummary(): Promise<DashboardSummary> {
    if (this.customSummary) {
      return this.customSummary;
    }

    const books =
      this.booksList.length > 0
        ? this.booksList
        : this.loansRepo
          ? this.loansRepo.getAllBooks()
          : [];

    const loans =
      this.loansList.length > 0
        ? this.loansList
        : this.loansRepo
          ? this.loansRepo.getLoans()
          : [];

    const activeBooks = books.filter((b) => !b.deletedAt);
    const totalBooks = activeBooks.length;
    const totalAvailability = activeBooks.reduce(
      (sum, b) => sum + Math.max(0, b.availableCount),
      0,
    );

    let borrowedCount = 0;
    let overdueCount = 0;
    let returnedCount = 0;
    let onTime = 0;
    let late = 0;

    for (const loan of loans) {
      if (loan.status === 'BORROWED' || loan.status === 'RETURN_PENDING') {
        borrowedCount++;
      } else if (loan.status === 'OVERDUE' || loan.status === 'FINE_PENDING') {
        overdueCount++;
      } else if (loan.status === 'RETURNED') {
        returnedCount++;
        if (loan.lateDays === 0) {
          onTime++;
        } else if (loan.lateDays > 0) {
          late++;
        }
      }
    }

    return {
      totalBooks,
      totalAvailability,
      borrowedCount,
      overdueCount,
      returnedCount,
      pieChart: {
        onTime,
        late,
      },
    };
  }
}