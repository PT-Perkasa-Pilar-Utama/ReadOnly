import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { QA_IDS } from '@readonly/db';
import { API_MESSAGES } from '@readonly/shared';
import { createApp } from '../../app';
import type { ClockPort } from '../../ports/clock';
import { MemoryStorageAdapter } from '../../ports/storage';
import { InMemoryJobsRepository } from '../jobs/jobs.repository';
import { JobsService } from '../jobs/jobs.service';
import { InMemoryLoansRepository } from '../loans/loans.repository';
import { LoansService } from '../loans/loans.service';
import { InMemoryNotificationsRepository } from './notifications.repository';
import { NotificationsService } from './notifications.service';

const MEMBER2_ID = '00000000-0000-4000-8000-000000000099';

class MockClock implements ClockPort {
  private currentTime: Date;

  constructor(initialTime: Date | string) {
    this.currentTime = new Date(initialTime);
  }

  now(): Date {
    return new Date(this.currentTime);
  }

  utcNow(): Date {
    return new Date(this.currentTime);
  }

  setTime(time: Date | string): void {
    this.currentTime = new Date(time);
  }

  addDays(days: number): void {
    this.currentTime = new Date(
      this.currentTime.getTime() + days * 24 * 60 * 60 * 1000,
    );
  }
}

interface TestHarness {
  app: ReturnType<typeof createApp>;
  loansRepository: InMemoryLoansRepository;
  notificationsRepository: InMemoryNotificationsRepository;
  notificationsService: NotificationsService;
  jobsService: JobsService;
  clock: MockClock;
  getAdminHeaders: () => Promise<Record<string, string>>;
  getMemberHeaders: () => Promise<Record<string, string>>;
  getMember2Headers: () => Promise<Record<string, string>>;
}

function createTestHarness(options?: { cleanLoans?: boolean }): TestHarness {
  // Current time: 2026-11-09T03:00:00Z -> 2026-11-09 10:00:00 WIB
  const clock = new MockClock('2026-11-09T03:00:00.000Z');
  const storagePort = new MemoryStorageAdapter();
  const loansRepository = new InMemoryLoansRepository();
  if (options?.cleanLoans) {
    loansRepository.clearLoans();
    loansRepository.clearNotifications();
  }
  const notificationsRepository = new InMemoryNotificationsRepository(
    loansRepository,
  );
  const notificationsService = new NotificationsService({
    repository: notificationsRepository,
    clock,
  });
  const loansService = new LoansService({
    repository: loansRepository,
    storage: storagePort,
    clock,
  });

  const app = createApp({
    loansRepository,
    loansService,
    notificationsRepository,
    notificationsService,
    storagePort,
    clock,
    bcryptSaltRounds: 4,
  });

  const jobsRepository = new InMemoryJobsRepository();
  const jobsService = new JobsService({
    repository: jobsRepository,
    loansRepository,
    loansService,
    notificationsService,
    clock,
  });

  let cachedAdminHeaders: Record<string, string> | null = null;
  let cachedMemberHeaders: Record<string, string> | null = null;
  let cachedMember2Headers: Record<string, string> | null = null;

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

  const getMember2Headers = async () => {
    if (cachedMember2Headers) {
      return cachedMember2Headers;
    }
    const res = await app.handle(
      new Request('http://localhost/api/v1/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          email: 'newmember@gmail.com',
          password: 'password',
        }),
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { token: string } };
    cachedMember2Headers = {
      cookie: `readonly_session=${body.data.token}`,
    };
    return cachedMember2Headers;
  };

  return {
    app,
    loansRepository,
    notificationsRepository,
    notificationsService,
    jobsService,
    clock,
    getAdminHeaders,
    getMemberHeaders,
    getMember2Headers,
  };
}

describe('Notifications API - BE-S3-05: Notifikasi job + daftar + payload popup login', () => {
  let originalAppEnv: string | undefined;

  beforeEach(() => {
    originalAppEnv = process.env.APP_ENV;
  });

  afterEach(() => {
    process.env.APP_ENV = originalAppEnv;
  });

  describe('RBAC & Data Isolation (SEC-02, SEC-05)', () => {
    it('returns 401 unauthorized when unauthenticated', async () => {
      const { app } = createTestHarness();

      const res = await app.handle(
        new Request('http://localhost/api/v1/notifications'),
      );

      expect(res.status).toBe(401);
      const body = await res.json();
      expect(body.error).toBe('Unauthorized');
      expect(body.message).toBe(API_MESSAGES.UNAUTHORIZED);
    });

    it('returns 403 forbidden when user is an admin', async () => {
      const { app, getAdminHeaders } = createTestHarness();
      const headers = await getAdminHeaders();

      const res = await app.handle(
        new Request('http://localhost/api/v1/notifications', {
          headers,
        }),
      );

      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toBe('Forbidden');
      expect(body.message).toBe(API_MESSAGES.FORBIDDEN);
    });

    it('returns 200 when authenticated as a member', async () => {
      const { app, getMemberHeaders } = createTestHarness();
      const headers = await getMemberHeaders();

      const res = await app.handle(
        new Request('http://localhost/api/v1/notifications', {
          headers,
        }),
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(Array.isArray(body.data)).toBe(true);
      expect(Array.isArray(body.login_popups)).toBe(true);
      expect(body.pagination).toBeDefined();
    });

    it('enforces member data isolation (SEC-05)', async () => {
      const {
        app,
        notificationsRepository,
        getMemberHeaders,
        getMember2Headers,
        clock,
      } = createTestHarness({ cleanLoans: true });

      // Add notification for member1
      notificationsRepository.addNotification({
        id: '11111111-1111-1111-1111-111111111111',
        loanId: QA_IDS.loans.borrow0,
        userId: QA_IDS.users.member1,
        type: 'DUE_SOON_3D',
        title: 'Batas pengembalian 3 hari lagi',
        text: 'Buku A perlu dikembalikan',
        bookTitle: 'Buku Member 1',
        dueDate: '2026-11-12',
        isRead: false,
        createdAt: clock.now(),
      });

      // Add notification for member2
      notificationsRepository.addNotification({
        id: '22222222-2222-2222-2222-222222222222',
        loanId: QA_IDS.loans.retPend,
        userId: MEMBER2_ID,
        type: 'DUE_TODAY',
        title:
          'Buku Member 2 sudah mencapai tenggat waktu peminjaman. Silahkan Dikembalikan',
        text: 'Buku Member 2 sudah mencapai tenggat waktu peminjaman. Silahkan Dikembalikan',
        bookTitle: 'Buku Member 2',
        dueDate: '2026-11-09',
        isRead: false,
        createdAt: clock.now(),
      });

      const member1Headers = await getMemberHeaders();
      const res1 = await app.handle(
        new Request('http://localhost/api/v1/notifications', {
          headers: member1Headers,
        }),
      );
      expect(res1.status).toBe(200);
      const body1 = await res1.json();
      expect(body1.data.length).toBe(1);
      expect(body1.data[0].id).toBe('11111111-1111-1111-1111-111111111111');

      const member2Headers = await getMember2Headers();
      const res2 = await app.handle(
        new Request('http://localhost/api/v1/notifications', {
          headers: member2Headers,
        }),
      );
      expect(res2.status).toBe(200);
      const body2 = await res2.json();
      expect(body2.data.length).toBe(1);
      expect(body2.data[0].id).toBe('22222222-2222-2222-2222-222222222222');
    });
  });

  describe('Query Validation & Pagination', () => {
    it('applies default page=1 and limit=10', async () => {
      const { app, getMemberHeaders } = createTestHarness();
      const headers = await getMemberHeaders();

      const res = await app.handle(
        new Request('http://localhost/api/v1/notifications', {
          headers,
        }),
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.pagination.page).toBe(1);
      expect(body.pagination.limit).toBe(10);
    });

    it('supports custom pagination page=2 and limit=1', async () => {
      const { app, notificationsRepository, getMemberHeaders, clock } =
        createTestHarness({ cleanLoans: true });

      for (let i = 1; i <= 3; i++) {
        notificationsRepository.addNotification({
          id: `00000000-0000-0000-0000-00000000000${i}`,
          loanId: `00000000-0000-0000-0000-00000000001${i}`,
          userId: QA_IDS.users.member1,
          type: 'DUE_SOON_3D',
          title: `Notif ${i}`,
          text: `Text ${i}`,
          bookTitle: `Book ${i}`,
          dueDate: '2026-11-12',
          isRead: false,
          createdAt: new Date(clock.now().getTime() + i * 1000),
        });
      }

      const headers = await getMemberHeaders();
      const res = await app.handle(
        new Request('http://localhost/api/v1/notifications?page=2&limit=1', {
          headers,
        }),
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.pagination.page).toBe(2);
      expect(body.pagination.limit).toBe(1);
      expect(body.pagination.total).toBe(3);
      expect(body.pagination.totalPages).toBe(3);
      expect(body.data.length).toBe(1);
      // Items sorted by created_at DESC -> 3, 2, 1 -> page 2 has Notif 2
      expect(body.data[0].title).toBe('Notif 2');
    });

    it('rejects invalid query parameters with 422 invalid_request', async () => {
      const { app, getMemberHeaders } = createTestHarness();
      const headers = await getMemberHeaders();

      // limit > 50
      const res1 = await app.handle(
        new Request('http://localhost/api/v1/notifications?limit=51', {
          headers,
        }),
      );
      expect(res1.status).toBe(422);

      // page <= 0
      const res2 = await app.handle(
        new Request('http://localhost/api/v1/notifications?page=0', {
          headers,
        }),
      );
      expect(res2.status).toBe(422);
    });
  });

  describe('Persistent Notifications List & Templates (AC-10.01–AC-10.03)', () => {
    it('returns notifications sorted by created_at DESC with verbatim templates', async () => {
      const { app, notificationsRepository, getMemberHeaders } =
        createTestHarness({ cleanLoans: true });

      const date1 = new Date('2026-11-09T01:00:00Z');
      const date2 = new Date('2026-11-09T02:00:00Z');
      const date3 = new Date('2026-11-09T03:00:00Z');

      // 1. DUE_SOON_3D (AC-10.02)
      notificationsRepository.addNotification({
        id: '10000000-0000-0000-0000-000000000001',
        loanId: QA_IDS.loans.borrow0,
        userId: QA_IDS.users.member1,
        type: 'DUE_SOON_3D',
        title: 'Batas pengembalian 3 hari lagi',
        text: 'Bumi Manusia perlu dikembalikan paling lambat 16 November 2026.',
        bookTitle: 'Bumi Manusia',
        dueDate: '2026-11-16',
        isRead: false,
        createdAt: date1,
      });

      // 2. DUE_TODAY (AC-10.01)
      notificationsRepository.addNotification({
        id: '10000000-0000-0000-0000-000000000002',
        loanId: QA_IDS.loans.returnedOn,
        userId: QA_IDS.users.member1,
        type: 'DUE_TODAY',
        title:
          'Filosofi Teras sudah mencapai tenggat waktu peminjaman. Silahkan Dikembalikan',
        text: 'Filosofi Teras sudah mencapai tenggat waktu peminjaman. Silahkan Dikembalikan',
        bookTitle: 'Filosofi Teras',
        dueDate: '2026-11-09',
        isRead: false,
        createdAt: date2,
      });

      // 3. OVERDUE (AC-10.03)
      notificationsRepository.addNotification({
        id: '10000000-0000-0000-0000-000000000003',
        loanId: QA_IDS.loans.over1,
        userId: QA_IDS.users.member1,
        type: 'OVERDUE',
        title: 'Buku melewati batas pengembalian',
        text: 'Laskar Pelangi jatuh tempo pada 5 November 2026. Segera ajukan pengembalian.',
        bookTitle: 'Laskar Pelangi',
        dueDate: '2026-11-05',
        isRead: false,
        createdAt: date3,
      });

      const headers = await getMemberHeaders();
      const res = await app.handle(
        new Request('http://localhost/api/v1/notifications', {
          headers,
        }),
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.length).toBe(3);

      // Latest first (date3 -> date2 -> date1)
      expect(body.data[0].id).toBe('10000000-0000-0000-0000-000000000003');
      expect(body.data[0].type).toBe('OVERDUE');
      expect(body.data[0].title).toBe('Buku melewati batas pengembalian');
      expect(body.data[0].text).toBe(
        'Laskar Pelangi jatuh tempo pada 5 November 2026. Segera ajukan pengembalian.',
      );
      expect(body.data[0].book_title).toBe('Laskar Pelangi');
      expect(body.data[0].due_date).toBe('2026-11-05');

      expect(body.data[1].id).toBe('10000000-0000-0000-0000-000000000002');
      expect(body.data[1].type).toBe('DUE_TODAY');
      expect(body.data[1].title).toBe(
        'Filosofi Teras sudah mencapai tenggat waktu peminjaman. Silahkan Dikembalikan',
      );
      expect(body.data[1].text).toBe(
        'Filosofi Teras sudah mencapai tenggat waktu peminjaman. Silahkan Dikembalikan',
      );

      expect(body.data[2].id).toBe('10000000-0000-0000-0000-000000000001');
      expect(body.data[2].type).toBe('DUE_SOON_3D');
      expect(body.data[2].title).toBe('Batas pengembalian 3 hari lagi');
      expect(body.data[2].text).toBe(
        'Bumi Manusia perlu dikembalikan paling lambat 16 November 2026.',
      );
    });
  });

  describe('Login Popups Payload & Priority (AC-10.04–AC-10.08)', () => {
    it('returns empty login_popups when member has no active reminder loans', async () => {
      const { app, getMemberHeaders } = createTestHarness({ cleanLoans: true });
      const headers = await getMemberHeaders();

      const res = await app.handle(
        new Request('http://localhost/api/v1/notifications', {
          headers,
        }),
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.login_popups).toEqual([]);
    });

    it('calculates login_popups with strict priority OVERDUE -> DUE_TODAY -> DUE_SOON (AC-10.07)', async () => {
      const { app, notificationsRepository, getMemberHeaders } =
        createTestHarness({ cleanLoans: true });

      // Today is 2026-11-09 WIB
      // Add loans for member1:
      // 1. DUE_SOON (remaining_days = 2: 2026-11-11)
      notificationsRepository.addLoan({
        loanId: '30000000-0000-0000-0000-000000000001',
        userId: QA_IDS.users.member1,
        bookTitle: 'Bumi Manusia',
        status: 'BORROWED',
        dueDate: '2026-11-11',
      });

      // 2. DUE_TODAY (due_date = 2026-11-09)
      notificationsRepository.addLoan({
        loanId: '30000000-0000-0000-0000-000000000002',
        userId: QA_IDS.users.member1,
        bookTitle: 'Filosofi Teras',
        status: 'BORROWED',
        dueDate: '2026-11-09',
      });

      // 3. OVERDUE (due_date = 2026-11-05, late_days = 4)
      notificationsRepository.addLoan({
        loanId: '30000000-0000-0000-0000-000000000003',
        userId: QA_IDS.users.member1,
        bookTitle: 'Laskar Pelangi',
        status: 'OVERDUE',
        dueDate: '2026-11-05',
        lateDays: 4,
      });

      const headers = await getMemberHeaders();
      const res = await app.handle(
        new Request('http://localhost/api/v1/notifications', {
          headers,
        }),
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.login_popups.length).toBe(3);

      // Priority 1: OVERDUE (AC-10.06, AC-10.07)
      expect(body.login_popups[0].condition).toBe('OVERDUE');
      expect(body.login_popups[0].books.length).toBe(1);
      expect(body.login_popups[0].books[0].loan_id).toBe(
        '30000000-0000-0000-0000-000000000003',
      );
      expect(body.login_popups[0].books[0].book_title).toBe('Laskar Pelangi');
      expect(body.login_popups[0].books[0].due_date).toBe('2026-11-05');
      expect(body.login_popups[0].books[0].late_days).toBe(4);
      expect(body.login_popups[0].books[0].message).toBe(
        'Laskar Pelangi terlambat 4 hari. Segera ajukan pengembalian.',
      );

      // Priority 2: DUE_TODAY (AC-10.05, AC-10.07)
      expect(body.login_popups[1].condition).toBe('DUE_TODAY');
      expect(body.login_popups[1].books.length).toBe(1);
      expect(body.login_popups[1].books[0].loan_id).toBe(
        '30000000-0000-0000-0000-000000000002',
      );
      expect(body.login_popups[1].books[0].book_title).toBe('Filosofi Teras');
      expect(body.login_popups[1].books[0].due_date).toBe('2026-11-09');
      expect(body.login_popups[1].books[0].message).toBe(
        'Filosofi Teras jatuh tempo hari ini. Silakan dikembalikan.',
      );

      // Priority 3: DUE_SOON (AC-10.04, AC-10.07)
      expect(body.login_popups[2].condition).toBe('DUE_SOON');
      expect(body.login_popups[2].books.length).toBe(1);
      expect(body.login_popups[2].books[0].loan_id).toBe(
        '30000000-0000-0000-0000-000000000001',
      );
      expect(body.login_popups[2].books[0].book_title).toBe('Bumi Manusia');
      expect(body.login_popups[2].books[0].due_date).toBe('2026-11-11');
      expect(body.login_popups[2].books[0].remaining_days).toBe(2);
      expect(body.login_popups[2].books[0].message).toBe(
        'Batas pengembalian 2 hari lagi',
      );
    });

    it('groups multiple books under the same condition (AC-10.07)', async () => {
      const { app, notificationsRepository, getMemberHeaders } =
        createTestHarness({ cleanLoans: true });

      // Two overdue books
      notificationsRepository.addLoan({
        loanId: '40000000-0000-0000-0000-000000000001',
        userId: QA_IDS.users.member1,
        bookTitle: 'Book Overdue A',
        status: 'OVERDUE',
        dueDate: '2026-11-07',
        lateDays: 2,
      });

      notificationsRepository.addLoan({
        loanId: '40000000-0000-0000-0000-000000000002',
        userId: QA_IDS.users.member1,
        bookTitle: 'Book Overdue B',
        status: 'OVERDUE',
        dueDate: '2026-11-06',
        lateDays: 3,
      });

      const headers = await getMemberHeaders();
      const res = await app.handle(
        new Request('http://localhost/api/v1/notifications', {
          headers,
        }),
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.login_popups.length).toBe(1);
      expect(body.login_popups[0].condition).toBe('OVERDUE');
      expect(body.login_popups[0].books.length).toBe(2);
      expect(body.login_popups[0].books[0].book_title).toBe('Book Overdue B');
      expect(body.login_popups[0].books[1].book_title).toBe('Book Overdue A');
    });

    it('excludes conditions with 0 matching books', async () => {
      const { app, notificationsRepository, getMemberHeaders } =
        createTestHarness({ cleanLoans: true });

      // Only DUE_TODAY loan, no OVERDUE or DUE_SOON
      notificationsRepository.addLoan({
        loanId: '50000000-0000-0000-0000-000000000001',
        userId: QA_IDS.users.member1,
        bookTitle: 'Buku Jatuh Tempo Hari Ini',
        status: 'BORROWED',
        dueDate: '2026-11-09',
      });

      const headers = await getMemberHeaders();
      const res = await app.handle(
        new Request('http://localhost/api/v1/notifications', {
          headers,
        }),
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.login_popups.length).toBe(1);
      expect(body.login_popups[0].condition).toBe('DUE_TODAY');
    });

    it('does not include loans with remaining_days > 3 or non-active statuses in login_popups', async () => {
      const { app, notificationsRepository, getMemberHeaders } =
        createTestHarness({ cleanLoans: true });

      // Remaining days = 4 (dueDate: 2026-11-13)
      notificationsRepository.addLoan({
        loanId: '60000000-0000-0000-0000-000000000001',
        userId: QA_IDS.users.member1,
        bookTitle: 'Buku 4 Hari Lagi',
        status: 'BORROWED',
        dueDate: '2026-11-13',
      });

      // Status RETURNED
      notificationsRepository.addLoan({
        loanId: '60000000-0000-0000-0000-000000000002',
        userId: QA_IDS.users.member1,
        bookTitle: 'Buku Sudah Dikembalikan',
        status: 'RETURNED',
        dueDate: '2026-11-09',
      });

      // Status PENDING
      notificationsRepository.addLoan({
        loanId: '60000000-0000-0000-0000-000000000003',
        userId: QA_IDS.users.member1,
        bookTitle: 'Buku Pending Peminjaman',
        status: 'PENDING',
        dueDate: '2026-11-09',
      });

      const headers = await getMemberHeaders();
      const res = await app.handle(
        new Request('http://localhost/api/v1/notifications', {
          headers,
        }),
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.login_popups).toEqual([]);
    });

    it('closing popups does not delete or affect persistent notifications in data (AC-10.08)', async () => {
      const { app, notificationsRepository, getMemberHeaders, clock } =
        createTestHarness({ cleanLoans: true });

      // Persistent notification in list
      notificationsRepository.addNotification({
        id: '70000000-0000-0000-0000-000000000001',
        loanId: QA_IDS.loans.borrow0,
        userId: QA_IDS.users.member1,
        type: 'DUE_SOON_3D',
        title: 'Batas pengembalian 3 hari lagi',
        text: 'Buku perlu dikembalikan',
        bookTitle: 'Clean Architecture',
        dueDate: '2026-11-12',
        isRead: false,
        createdAt: clock.now(),
      });

      // Active popup loan
      notificationsRepository.addLoan({
        loanId: QA_IDS.loans.borrow0,
        userId: QA_IDS.users.member1,
        bookTitle: 'Clean Architecture',
        status: 'BORROWED',
        dueDate: '2026-11-12',
      });

      const headers = await getMemberHeaders();
      const res = await app.handle(
        new Request('http://localhost/api/v1/notifications', {
          headers,
        }),
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      // Persistent notification is present
      expect(body.data.length).toBe(1);
      expect(body.data[0].id).toBe('70000000-0000-0000-0000-000000000001');
      // Popup payload is present
      expect(body.login_popups.length).toBe(1);
      expect(body.login_popups[0].condition).toBe('DUE_SOON');
    });
  });

  describe('Notifications Daily Job (AC-06.03, AC-10.01–AC-10.03)', () => {
    it('creates DUE_SOON_3D, DUE_TODAY, and OVERDUE notifications and enforces unique constraint', async () => {
      const { notificationsService, notificationsRepository, clock } =
        createTestHarness({ cleanLoans: true });

      // Today is 2026-11-09 WIB
      // Loan 1: Due in 3 days (2026-11-12) -> DUE_SOON_3D
      notificationsRepository.addLoan({
        loanId: '80000000-0000-0000-0000-000000000001',
        userId: QA_IDS.users.member1,
        bookTitle: 'Book Due Soon',
        status: 'BORROWED',
        dueDate: '2026-11-12',
      });

      // Loan 2: Due today (2026-11-09) -> DUE_TODAY
      notificationsRepository.addLoan({
        loanId: '80000000-0000-0000-0000-000000000002',
        userId: QA_IDS.users.member1,
        bookTitle: 'Book Due Today',
        status: 'BORROWED',
        dueDate: '2026-11-09',
      });

      // Loan 3: Overdue (2026-11-05) -> OVERDUE
      notificationsRepository.addLoan({
        loanId: '80000000-0000-0000-0000-000000000003',
        userId: QA_IDS.users.member1,
        bookTitle: 'Book Overdue',
        status: 'OVERDUE',
        dueDate: '2026-11-05',
        lateDays: 4,
      });

      const rowsAffected = await notificationsService.createDailyNotifications(
        clock.now(),
      );
      expect(rowsAffected).toBe(3);

      const notifs = notificationsRepository.getNotifications();
      expect(notifs.length).toBe(3);

      const dueSoonNotif = notifs.find((n) => n.type === 'DUE_SOON_3D');
      expect(dueSoonNotif).toBeDefined();
      expect(dueSoonNotif?.title).toBe('Batas pengembalian 3 hari lagi');
      expect(dueSoonNotif?.text).toBe(
        'Book Due Soon perlu dikembalikan paling lambat 12 November 2026.',
      );

      const dueTodayNotif = notifs.find((n) => n.type === 'DUE_TODAY');
      expect(dueTodayNotif).toBeDefined();
      expect(dueTodayNotif?.title).toBe(
        'Book Due Today sudah mencapai tenggat waktu peminjaman. Silahkan Dikembalikan',
      );

      const overdueNotif = notifs.find((n) => n.type === 'OVERDUE');
      expect(overdueNotif).toBeDefined();
      expect(overdueNotif?.title).toBe('Buku melewati batas pengembalian');
      expect(overdueNotif?.text).toBe(
        'Book Overdue jatuh tempo pada 5 November 2026. Segera ajukan pengembalian.',
      );

      // Running second time should insert 0 rows due to unique constraint (idempotency)
      const secondRun = await notificationsService.createDailyNotifications(
        clock.now(),
      );
      expect(secondRun).toBe(0);
      expect(notificationsRepository.getNotifications().length).toBe(3);
    });

    it('SEC-13 & POST /admin/jobs/run: executes notifications job and returns 404 in production', async () => {
      process.env.APP_ENV = 'test';
      const { app, notificationsRepository, clock } = createTestHarness({
        cleanLoans: true,
      });

      notificationsRepository.addLoan({
        loanId: '90000000-0000-0000-0000-000000000001',
        userId: QA_IDS.users.member1,
        bookTitle: 'Clean Code',
        status: 'BORROWED',
        dueDate: '2026-11-12', // 3 days from 2026-11-09
      });

      const res = await app.handle(
        new Request('http://localhost/api/v1/admin/jobs/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ job: 'notifications' }),
        }),
      );

      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.data.job).toBe('notifications');
      expect(body.data.rows_affected).toBe(1);

      // In production: returns 404
      process.env.APP_ENV = 'production';
      const prodApp = createApp({ clock });
      const prodRes = await prodApp.handle(
        new Request('http://localhost/api/v1/admin/jobs/run', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ job: 'notifications' }),
        }),
      );
      expect(prodRes.status).toBe(404);
    });
  });
});
