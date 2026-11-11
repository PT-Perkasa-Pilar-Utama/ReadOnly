import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { type Database, QA_IDS } from '@readonly/db';
import { createApp } from '../../app';
import type { ClockPort } from '../../ports/clock';
import { MemoryStorageAdapter } from '../../ports/storage';
import { InMemoryLoansRepository } from '../loans/loans.repository';
import { LoansService } from '../loans/loans.service';
import {
  DrizzleJobsRepository,
  InMemoryJobsRepository,
} from './jobs.repository';
import { JobsService } from './jobs.service';

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

describe('jobs module - Job status terlambat (BE-S3-02 / AC-06.03, Q-31)', () => {
  let originalAppEnv: string | undefined;

  beforeEach(() => {
    originalAppEnv = process.env.APP_ENV;
  });

  afterEach(() => {
    process.env.APP_ENV = originalAppEnv;
  });

  it('SEC-13: does not register POST /admin/jobs/run when APP_ENV is production (returns 404)', async () => {
    process.env.APP_ENV = 'production';

    const clock = new MockClock('2026-11-09T03:00:00.000Z');
    const app = createApp({ clock });

    const response = await app.handle(
      new Request('http://localhost/api/v1/admin/jobs/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job: 'status_overdue' }),
      }),
    );

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe('Not Found');
    expect(body.code).toBe('not_found');
  });

  it('SEC-13: registers POST /admin/jobs/run when APP_ENV is development or test', async () => {
    process.env.APP_ENV = 'test';

    const clock = new MockClock('2026-11-09T03:00:00.000Z');
    const app = createApp({ clock });

    const response = await app.handle(
      new Request('http://localhost/api/v1/admin/jobs/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job: 'status_overdue' }),
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.job).toBe('status_overdue');
    expect(typeof body.data.rows_affected).toBe('number');
  });

  it('validates job parameter and rejects unknown job names with 422 invalid_request', async () => {
    process.env.APP_ENV = 'test';

    const clock = new MockClock('2026-11-09T03:00:00.000Z');
    const app = createApp({ clock });

    const response = await app.handle(
      new Request('http://localhost/api/v1/admin/jobs/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job: 'invalid_job_name' }),
      }),
    );

    expect(response.status).toBe(422);
    const body = await response.json();
    expect(body.code).toBe('invalid_request');
  });

  it('supports query parameter ?job=status_overdue without body', async () => {
    process.env.APP_ENV = 'test';

    const clock = new MockClock('2026-11-09T03:00:00.000Z');
    const app = createApp({ clock });

    const response = await app.handle(
      new Request('http://localhost/api/v1/admin/jobs/run?job=status_overdue', {
        method: 'POST',
      }),
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.job).toBe('status_overdue');
  });

  it('transitions BORROWED to OVERDUE when due_date < today_wib (AC-06.03)', async () => {
    // Current time: 2026-11-09 00:05:00 WIB (2026-11-08 17:05:00 UTC)
    const clock = new MockClock('2026-11-08T17:05:00.000Z');
    const loansRepo = new InMemoryLoansRepository();
    const storage = new MemoryStorageAdapter();
    const loansService = new LoansService({
      repository: loansRepo,
      storage,
      clock,
    });
    const jobsRepo = new InMemoryJobsRepository();
    const jobsService = new JobsService({
      repository: jobsRepo,
      loansRepository: loansRepo,
      loansService,
      clock,
    });

    // Seed custom loan in BORROWED status with due_date = '2026-11-08' (1 day overdue on Nov 9 WIB)
    const testLoanId = '11111111-0000-4000-8000-000000000001';
    loansRepo.addLoan({
      id: testLoanId,
      loanNo: 'PJM-20261101-0099',
      userId: QA_IDS.users.member1,
      bookId: QA_IDS.books.bookB,
      status: 'BORROWED',
      requestedAt: new Date('2026-11-01T03:00:00Z'),
      confirmedAt: new Date('2026-11-01T03:00:00Z'),
      dueDate: '2026-11-08',
      returnRequestedAt: null,
      returnedAt: null,
      lateDays: 0,
      fineAmount: null,
      fineStatus: 'Belum Bayar',
    });

    const result = await jobsService.runStatusOverdueJob({ force: true });
    expect(result.job).toBe('status_overdue');
    expect(result.rows_affected).toBeGreaterThanOrEqual(1);

    const updatedLoan = await loansRepo.findLoanById(testLoanId);
    expect(updatedLoan?.status).toBe('OVERDUE');
    expect(updatedLoan?.lateDays).toBe(1);
    expect(updatedLoan?.fineAmount).toBe(2000);
    expect(updatedLoan?.fineStatus).toBe('Belum Bayar');

    // Audit log in loan_events
    const events = loansRepo.getLoanEvents(testLoanId);
    expect(events.length).toBe(1);
    expect(events[0]?.fromStatus).toBe('BORROWED');
    expect(events[0]?.toStatus).toBe('OVERDUE');
    expect(events[0]?.actorId).toBeNull();

    // Notification created
    const notifs = loansRepo.getNotifications(testLoanId);
    expect(notifs.length).toBe(1);
    expect(notifs[0]?.type).toBe('OVERDUE');
    expect(notifs[0]?.title).toBe('Buku melewati batas pengembalian');
    expect(notifs[0]?.text).toContain('Book-B: Clean Architecture');
    expect(notifs[0]?.text).toContain('8 November 2026');
  });

  it('verifies boundary calculation for fine_amount across late days (1, 4, 5, 6 days)', async () => {
    // Current time: 2026-11-15 00:05:00 WIB (2026-11-14 17:05:00 UTC)
    const clock = new MockClock('2026-11-14T17:05:00.000Z');
    const loansRepo = new InMemoryLoansRepository();
    const storage = new MemoryStorageAdapter();
    const loansService = new LoansService({
      repository: loansRepo,
      storage,
      clock,
    });
    const jobsRepo = new InMemoryJobsRepository();
    const jobsService = new JobsService({
      repository: jobsRepo,
      loansRepository: loansRepo,
      loansService,
      clock,
    });

    const boundaryCases: {
      id: string;
      dueDate: string;
      expectedLateDays: number;
      expectedFine: number | null;
    }[] = [
      {
        id: '22222222-0000-4000-8000-000000000001',
        dueDate: '2026-11-14',
        expectedLateDays: 1,
        expectedFine: 2000,
      },
      {
        id: '22222222-0000-4000-8000-000000000004',
        dueDate: '2026-11-11',
        expectedLateDays: 4,
        expectedFine: 2000,
      },
      {
        id: '22222222-0000-4000-8000-000000000005',
        dueDate: '2026-11-10',
        expectedLateDays: 5,
        expectedFine: null,
      },
      {
        id: '22222222-0000-4000-8000-000000000006',
        dueDate: '2026-11-09',
        expectedLateDays: 6,
        expectedFine: null,
      },
    ];

    for (const testCase of boundaryCases) {
      loansRepo.addLoan({
        id: testCase.id,
        loanNo: `PJM-TEST-${testCase.expectedLateDays}`,
        userId: QA_IDS.users.member1,
        bookId: QA_IDS.books.bookB,
        status: 'BORROWED',
        requestedAt: new Date('2026-11-01T03:00:00Z'),
        confirmedAt: new Date('2026-11-01T03:00:00Z'),
        dueDate: testCase.dueDate,
        returnRequestedAt: null,
        returnedAt: null,
        lateDays: 0,
        fineAmount: null,
        fineStatus: 'Belum Bayar',
      });
    }

    await jobsService.runStatusOverdueJob({ force: true });

    for (const testCase of boundaryCases) {
      const loan = await loansRepo.findLoanById(testCase.id);
      expect(loan?.status).toBe('OVERDUE');
      expect(loan?.lateDays).toBe(testCase.expectedLateDays);
      expect(loan?.fineAmount).toBe(testCase.expectedFine);
    }
  });

  it('does NOT alter loans whose dueDate is today or in the future', async () => {
    // Current time: 2026-11-09 00:05:00 WIB
    const clock = new MockClock('2026-11-08T17:05:00.000Z');
    const loansRepo = new InMemoryLoansRepository();
    const storage = new MemoryStorageAdapter();
    const loansService = new LoansService({
      repository: loansRepo,
      storage,
      clock,
    });
    const jobsRepo = new InMemoryJobsRepository();
    const jobsService = new JobsService({
      repository: jobsRepo,
      loansRepository: loansRepo,
      loansService,
      clock,
    });

    const activeLoanId = '33333333-0000-4000-8000-000000000001';
    loansRepo.addLoan({
      id: activeLoanId,
      loanNo: 'PJM-ACTIVE-1',
      userId: QA_IDS.users.member1,
      bookId: QA_IDS.books.bookB,
      status: 'BORROWED',
      requestedAt: new Date('2026-11-05T03:00:00Z'),
      confirmedAt: new Date('2026-11-05T03:00:00Z'),
      dueDate: '2026-11-12', // future
      returnRequestedAt: null,
      returnedAt: null,
      lateDays: 0,
      fineAmount: 0,
      fineStatus: 'Belum Bayar',
    });

    await jobsService.runStatusOverdueJob({ force: true });

    const loan = await loansRepo.findLoanById(activeLoanId);
    expect(loan?.status).toBe('BORROWED');
    expect(loan?.lateDays).toBe(0);
  });

  it('does NOT alter loans where return_requested_at is set (Q-24 / status beku)', async () => {
    // Current time: 2026-11-09 00:05:00 WIB
    const clock = new MockClock('2026-11-08T17:05:00.000Z');
    const loansRepo = new InMemoryLoansRepository();
    const storage = new MemoryStorageAdapter();
    const loansService = new LoansService({
      repository: loansRepo,
      storage,
      clock,
    });
    const jobsRepo = new InMemoryJobsRepository();
    const jobsService = new JobsService({
      repository: jobsRepo,
      loansRepository: loansRepo,
      loansService,
      clock,
    });

    const pendingReturnLoanId = '44444444-0000-4000-8000-000000000001';
    loansRepo.addLoan({
      id: pendingReturnLoanId,
      loanNo: 'PJM-PEND-RET-1',
      userId: QA_IDS.users.member1,
      bookId: QA_IDS.books.bookB,
      status: 'BORROWED',
      requestedAt: new Date('2026-11-01T03:00:00Z'),
      confirmedAt: new Date('2026-11-01T03:00:00Z'),
      dueDate: '2026-11-07', // past due date
      returnRequestedAt: new Date('2026-11-07T10:00:00Z'), // frozen at request
      returnedAt: null,
      lateDays: 0,
      fineAmount: 0,
      fineStatus: 'Belum Bayar',
    });

    await jobsService.runStatusOverdueJob({ force: true });

    const loan = await loansRepo.findLoanById(pendingReturnLoanId);
    expect(loan?.status).toBe('BORROWED');
  });

  it('enforces idempotency and skips duplicate execution on the same WIB day', async () => {
    const clock = new MockClock('2026-11-08T17:05:00.000Z');
    const loansRepo = new InMemoryLoansRepository();
    const storage = new MemoryStorageAdapter();
    const loansService = new LoansService({
      repository: loansRepo,
      storage,
      clock,
    });
    const jobsRepo = new InMemoryJobsRepository();
    const jobsService = new JobsService({
      repository: jobsRepo,
      loansRepository: loansRepo,
      loansService,
      clock,
    });

    const firstRun = await jobsService.runStatusOverdueJob();
    expect(firstRun.skipped).toBeUndefined();

    // Second run on the same day without force
    const secondRun = await jobsService.runStatusOverdueJob();
    expect(secondRun.skipped).toBe(true);
    expect(secondRun.rows_affected).toBe(0);

    // Runs on next day should execute
    clock.addDays(1);
    const nextDayRun = await jobsService.runStatusOverdueJob();
    expect(nextDayRun.skipped).toBeUndefined();
  });

  it('catchUp() runs when no run has executed today, and skips if already executed (Q-31)', async () => {
    const clock = new MockClock('2026-11-08T17:05:00.000Z');
    const loansRepo = new InMemoryLoansRepository();
    const storage = new MemoryStorageAdapter();
    const loansService = new LoansService({
      repository: loansRepo,
      storage,
      clock,
    });
    const jobsRepo = new InMemoryJobsRepository();
    const jobsService = new JobsService({
      repository: jobsRepo,
      loansRepository: loansRepo,
      loansService,
      clock,
    });

    const firstCatchUp = await jobsService.catchUp();
    expect(firstCatchUp).not.toBeNull();

    const secondCatchUp = await jobsService.catchUp();
    expect(secondCatchUp).toBeNull();
  });

  it('records job run history in job_runs table', async () => {
    const clock = new MockClock('2026-11-08T17:05:00.000Z');
    const loansRepo = new InMemoryLoansRepository();
    const storage = new MemoryStorageAdapter();
    const loansService = new LoansService({
      repository: loansRepo,
      storage,
      clock,
    });
    const jobsRepo = new InMemoryJobsRepository();
    const jobsService = new JobsService({
      repository: jobsRepo,
      loansRepository: loansRepo,
      loansService,
      clock,
    });

    await jobsService.runStatusOverdueJob({ force: true });

    const runs = jobsRepo.getRuns();
    expect(runs.length).toBe(1);
    expect(runs[0]?.jobName).toBe('status_overdue');
    expect(runs[0]?.finishedAt).not.toBeNull();
    expect(typeof runs[0]?.rowsAffected).toBe('number');
  });

  it('LoanService.transition enforces state machine boundaries', async () => {
    const clock = new MockClock('2026-11-08T17:05:00.000Z');
    const loansRepo = new InMemoryLoansRepository();
    const storage = new MemoryStorageAdapter();
    const loansService = new LoansService({
      repository: loansRepo,
      storage,
      clock,
    });

    // 1. Transition non-existent loan throws 404
    expect(
      loansService.transition({
        loanId: '00000000-0000-0000-0000-000000000999',
        targetStatus: 'OVERDUE',
      }),
    ).rejects.toThrow();

    // 2. Transition from PENDING directly to OVERDUE is invalid (throws 422)
    expect(
      loansService.transition({
        loanId: QA_IDS.loans.pending,
        targetStatus: 'OVERDUE',
      }),
    ).rejects.toThrow();

    // 3. Transition from RETURNED to any status is terminal (throws 422)
    expect(
      loansService.transition({
        loanId: QA_IDS.loans.returnedOn,
        targetStatus: 'BORROWED',
      }),
    ).rejects.toThrow();
  });

  it('scheduler starts and stops cleanly without leaving active handles', () => {
    const clock = new MockClock('2026-11-08T17:05:00.000Z');
    const loansRepo = new InMemoryLoansRepository();
    const storage = new MemoryStorageAdapter();
    const loansService = new LoansService({
      repository: loansRepo,
      storage,
      clock,
    });
    const jobsRepo = new InMemoryJobsRepository();
    const jobsService = new JobsService({
      repository: jobsRepo,
      loansRepository: loansRepo,
      loansService,
      clock,
    });

    jobsService.startScheduler();
    expect(jobsService.isSchedulerRunning()).toBe(true);

    jobsService.stopScheduler();
    expect(jobsService.isSchedulerRunning()).toBe(false);
  });

  it('DrizzleJobsRepository executes methods with Database interface', async () => {
    let advisoryLockExecuted = false;
    let jobRunCreated = false;
    let jobRunFinished = false;

    const fakeDb = {
      transaction: async (fn: (tx: unknown) => unknown) => {
        const fakeTx = {
          execute: async () => {
            advisoryLockExecuted = true;
            return [];
          },
        };
        return await fn(fakeTx);
      },
      insert: () => ({
        values: () => ({
          returning: async () => {
            jobRunCreated = true;
            return [{ id: 'mock-job-run-id' }];
          },
        }),
      }),
      update: () => ({
        set: () => ({
          where: async () => {
            jobRunFinished = true;
          },
        }),
      }),
      select: () => ({
        from: () => ({
          where: () => ({
            orderBy: () => ({
              limit: async () => [],
            }),
          }),
        }),
      }),
    } as unknown as Database;

    const repo = new DrizzleJobsRepository(fakeDb);

    // Test executeWithAdvisoryLock
    const lockResult = await repo.executeWithAdvisoryLock(
      'test_lock',
      async () => {
        return 'lock_ok';
      },
    );
    expect(lockResult).toBe('lock_ok');
    expect(advisoryLockExecuted).toBe(true);

    // Test createJobRun
    const runId = await repo.createJobRun('status_overdue', new Date());
    expect(runId).toBe('mock-job-run-id');
    expect(jobRunCreated).toBe(true);

    // Test finishJobRun
    await repo.finishJobRun(runId, new Date(), 5);
    expect(jobRunFinished).toBe(true);

    // Test getLastSuccessfulRun
    const lastRun = await repo.getLastSuccessfulRun('status_overdue');
    expect(lastRun).toBeNull();
  });
});
