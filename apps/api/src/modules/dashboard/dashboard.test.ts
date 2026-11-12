import { describe, expect, it } from 'bun:test';
import type { Database } from '@readonly/db';
import { QA_EXPECTED_DASHBOARD_SUMMARY } from '@readonly/db';
import { createApp } from '../../app';
import {
  type DashboardSummary,
  DrizzleDashboardRepository,
  InMemoryDashboardRepository,
} from './dashboard.repository';
import { DashboardService } from './dashboard.service';

interface TestHarness {
  app: ReturnType<typeof createApp>;
  dashboardRepository: InMemoryDashboardRepository;
  dashboardService: DashboardService;
  getAdminHeaders: () => Promise<Record<string, string>>;
  getMemberHeaders: () => Promise<Record<string, string>>;
}

function createTestHarness(
  customRepo?: InMemoryDashboardRepository,
): TestHarness {
  const dashboardRepository = customRepo ?? new InMemoryDashboardRepository();
  const dashboardService = new DashboardService(dashboardRepository);

  const app = createApp({
    dashboardRepository,
    dashboardService,
    bcryptSaltRounds: 4,
  });

  let cachedAdminHeaders: Record<string, string> | null = null;
  let cachedMemberHeaders: Record<string, string> | null = null;

  const getAdminHeaders = async () => {
    if (cachedAdminHeaders) {
      return cachedAdminHeaders;
    }
    const res = await app.handle(
      new Request('http://localhost/api/v1/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: 'admin@readonly.ppu.co.id',
          password: 'password123',
        }),
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { token: string } };
    cachedAdminHeaders = {
      cookie: `readonly_session=${body.data.token}`,
    };
    return cachedAdminHeaders;
  };

  const getMemberHeaders = async () => {
    if (cachedMemberHeaders) {
      return cachedMemberHeaders;
    }
    const res = await app.handle(
      new Request('http://localhost/api/v1/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: 'member1@readonly.ppu.co.id',
          password: 'password123',
        }),
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { token: string } };
    cachedMemberHeaders = {
      cookie: `readonly_session=${body.data.token}`,
    };
    return cachedMemberHeaders;
  };

  return {
    app,
    dashboardRepository,
    dashboardService,
    getAdminHeaders,
    getMemberHeaders,
  };
}

describe('Dashboard API - BE-S2-04: GET /admin/dashboard/summary (AC-04.01, Q-26)', () => {
  describe('RBAC and Authorization', () => {
    it('returns 401 unauthorized when request has no session credentials', async () => {
      const { app } = createTestHarness();

      const res = await app.handle(
        new Request('http://localhost/api/v1/admin/dashboard/summary', {
          method: 'GET',
        }),
      );

      expect(res.status).toBe(401);
      const json = (await res.json()) as { code: string; error: string };
      expect(json.code).toBe('session_not_found');
      expect(json.error).toBe('Unauthorized');
    });

    it('returns 401 unauthorized when bearer token is invalid', async () => {
      const { app } = createTestHarness();

      const res = await app.handle(
        new Request('http://localhost/api/v1/admin/dashboard/summary', {
          method: 'GET',
          headers: {
            authorization: 'Bearer invalid-token-xyz',
          },
        }),
      );

      expect(res.status).toBe(401);
      const json = (await res.json()) as { code: string; error: string };
      expect(json.code).toBe('session_not_found');
      expect(json.error).toBe('Unauthorized');
    });

    it('returns 403 forbidden when authenticated user is a member', async () => {
      const { app, getMemberHeaders } = createTestHarness();
      const headers = await getMemberHeaders();

      const res = await app.handle(
        new Request('http://localhost/api/v1/admin/dashboard/summary', {
          method: 'GET',
          headers,
        }),
      );

      expect(res.status).toBe(403);
      const json = (await res.json()) as { code: string; error: string };
      expect(json.code).toBe('forbidden');
    });

    it('returns 200 OK with expected QA seed metrics when authenticated as admin', async () => {
      // Test harness with default app options (which links to InMemoryLoansRepository with QA seed data)
      const app = createApp({ bcryptSaltRounds: 4 });

      const loginRes = await app.handle(
        new Request('http://localhost/api/v1/auth/login', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            email: 'admin@readonly.ppu.co.id',
            password: 'password123',
          }),
        }),
      );
      expect(loginRes.status).toBe(200);
      const loginBody = (await loginRes.json()) as { data: { token: string } };

      const res = await app.handle(
        new Request('http://localhost/api/v1/admin/dashboard/summary', {
          method: 'GET',
          headers: {
            cookie: `readonly_session=${loginBody.data.token}`,
          },
        }),
      );

      expect(res.status).toBe(200);
      const json = (await res.json()) as {
        data: DashboardSummary;
        message: string;
      };

      expect(json.message).toBe('ok');
      expect(json.data).toEqual(QA_EXPECTED_DASHBOARD_SUMMARY);
      expect(json.data).toEqual({
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
    });
  });

  describe('Metric calculation rules (Q-26 / AC-04.01)', () => {
    it('returns zeros for an empty system state', async () => {
      const repo = new InMemoryDashboardRepository({
        books: [],
        loans: [],
      });
      const { app, getAdminHeaders } = createTestHarness(repo);
      const headers = await getAdminHeaders();

      const res = await app.handle(
        new Request('http://localhost/api/v1/admin/dashboard/summary', {
          method: 'GET',
          headers,
        }),
      );

      expect(res.status).toBe(200);
      const json = (await res.json()) as { data: DashboardSummary };
      expect(json.data).toEqual({
        totalBooks: 0,
        totalAvailability: 0,
        borrowedCount: 0,
        overdueCount: 0,
        returnedCount: 0,
        pieChart: {
          onTime: 0,
          late: 0,
        },
      });
    });

    it('excludes soft-deleted books from totalBooks and totalAvailability', async () => {
      const repo = new InMemoryDashboardRepository({
        books: [
          { id: 'book-1', availableCount: 5, deletedAt: null },
          { id: 'book-2', availableCount: 3, deletedAt: null },
          { id: 'book-3-deleted', availableCount: 10, deletedAt: new Date() },
        ],
        loans: [],
      });
      const summary = await repo.getSummary();

      expect(summary.totalBooks).toBe(2);
      expect(summary.totalAvailability).toBe(8);
    });

    it('groups loans by status according to Q-26 definition', async () => {
      const repo = new InMemoryDashboardRepository({
        books: [{ id: 'b1', availableCount: 1, deletedAt: null }],
        loans: [
          // PENDING: must be excluded from borrowed, overdue, and returned
          { id: 'l-pend', status: 'PENDING', lateDays: 0 },
          // BORROWED and RETURN_PENDING -> borrowedCount
          { id: 'l-borrow', status: 'BORROWED', lateDays: 0 },
          { id: 'l-ret-pend', status: 'RETURN_PENDING', lateDays: 0 },
          // OVERDUE and FINE_PENDING -> overdueCount
          { id: 'l-over-1', status: 'OVERDUE', lateDays: 2 },
          { id: 'l-over-2', status: 'OVERDUE', lateDays: 5 },
          { id: 'l-fine-pend', status: 'FINE_PENDING', lateDays: 3 },
          // RETURNED -> returnedCount, with onTime vs late distribution
          { id: 'l-ret-on-1', status: 'RETURNED', lateDays: 0 },
          { id: 'l-ret-on-2', status: 'RETURNED', lateDays: 0 },
          { id: 'l-ret-late-1', status: 'RETURNED', lateDays: 1 },
          { id: 'l-ret-late-2', status: 'RETURNED', lateDays: 4 },
        ],
      });

      const summary = await repo.getSummary();

      expect(summary.borrowedCount).toBe(2);
      expect(summary.overdueCount).toBe(3);
      expect(summary.returnedCount).toBe(4);
      expect(summary.pieChart.onTime).toBe(2);
      expect(summary.pieChart.late).toBe(2);
    });

    it('does not count late_days > 0 of non-returned loans in pieChart.late', async () => {
      const repo = new InMemoryDashboardRepository({
        books: [],
        loans: [
          { id: 'l-overdue', status: 'OVERDUE', lateDays: 10 },
          { id: 'l-fine', status: 'FINE_PENDING', lateDays: 8 },
        ],
      });

      const summary = await repo.getSummary();
      expect(summary.overdueCount).toBe(2);
      expect(summary.returnedCount).toBe(0);
      expect(summary.pieChart.late).toBe(0);
      expect(summary.pieChart.onTime).toBe(0);
    });

    it('honors setSummary override when explicitly set', async () => {
      const repo = new InMemoryDashboardRepository();
      const custom: DashboardSummary = {
        totalBooks: 100,
        totalAvailability: 75,
        borrowedCount: 20,
        overdueCount: 5,
        returnedCount: 50,
        pieChart: { onTime: 45, late: 5 },
      };
      repo.setSummary(custom);

      const summary = await repo.getSummary();
      expect(summary).toEqual(custom);
    });

    it('honors dynamic updates with setBooks and setLoans', async () => {
      const repo = new InMemoryDashboardRepository();
      repo.setBooks([{ id: 'b-new', availableCount: 15, deletedAt: null }]);
      repo.setLoans([{ id: 'l-new', status: 'BORROWED', lateDays: 0 }]);

      const summary = await repo.getSummary();
      expect(summary.totalBooks).toBe(1);
      expect(summary.totalAvailability).toBe(15);
      expect(summary.borrowedCount).toBe(1);
    });
  });

  describe('DrizzleDashboardRepository', () => {
    it('executes SQL queries and maps result correctly', async () => {
      let selectCount = 0;
      const mockDb = {
        select: () => ({
          from: () => {
            selectCount++;
            return Object.assign(
              Promise.resolve([
                {
                  borrowedCount: '2',
                  overdueCount: '6',
                  returnedCount: '2',
                  onTime: '1',
                  late: '1',
                },
              ]),
              {
                where: () =>
                  Promise.resolve([
                    { totalBooks: '12', totalAvailability: '8' },
                  ]),
              },
            );
          },
        }),
      } as unknown as Database;

      const repo = new DrizzleDashboardRepository(mockDb);
      const summary = await repo.getSummary();

      expect(selectCount).toBe(2);
      expect(summary).toEqual({
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
    });

    it('gracefully handles empty query results in DrizzleDashboardRepository', async () => {
      const mockDb = {
        select: () => ({
          from: () =>
            Object.assign(Promise.resolve([]), {
              where: () => Promise.resolve([]),
            }),
        }),
      } as unknown as Database;

      const repo = new DrizzleDashboardRepository(mockDb);
      const summary = await repo.getSummary();

      expect(summary).toEqual({
        totalBooks: 0,
        totalAvailability: 0,
        borrowedCount: 0,
        overdueCount: 0,
        returnedCount: 0,
        pieChart: {
          onTime: 0,
          late: 0,
        },
      });
    });
  });

  describe('DashboardService', () => {
    it('delegates getSummary to repository', async () => {
      const mockSummary: DashboardSummary = {
        totalBooks: 10,
        totalAvailability: 5,
        borrowedCount: 3,
        overdueCount: 1,
        returnedCount: 6,
        pieChart: { onTime: 5, late: 1 },
      };

      const mockRepo = {
        getSummary: async () => mockSummary,
      };

      const service = new DashboardService(mockRepo);
      const result = await service.getSummary();
      expect(result).toEqual(mockSummary);
    });
  });
});