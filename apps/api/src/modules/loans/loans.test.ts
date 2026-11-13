import { describe, expect, it } from 'bun:test';
import {
  type Database,
  QA_IDS,
  QA_PENDING_MANUAL_CODE,
  QA_PENDING_QR_TOKEN,
  sha256Hex,
} from '@readonly/db';
import {
  type AdminLoanDetailResponse,
  type AdminLoansResponse,
  type ApiErrorEnvelope,
  FINE_PAYMENT_SUCCESS_MESSAGE,
  FINE_REQUIRED_MESSAGE,
  type FinePaymentResponse,
  MANUAL_CODE_REGEX,
  type QrConfirmResponse,
  type QrPreviewResponse,
  RATING_REQUIRED_MESSAGE,
  RETURN_CONFIRM_SUCCESS_MESSAGE,
  RETURN_SUCCESS_MESSAGE,
  type ReturnConfirmResponse,
  type ReturnLoanResponse,
} from '@readonly/shared';
import { createApp } from '../../app';
import type { ClockPort } from '../../ports/clock';
import { MemoryStorageAdapter } from '../../ports/storage';
import {
  DrizzleLoansRepository,
  type InMemoryLoan,
  InMemoryLoansRepository,
} from './loans.repository';
import { LoansService } from './loans.service';

class MockClock implements ClockPort {
  private currentTime: Date;

  constructor(initialTime: Date) {
    this.currentTime = initialTime;
  }

  now(): Date {
    return new Date(this.currentTime.getTime());
  }

  utcNow(): Date {
    return new Date(this.currentTime.getTime());
  }

  setTime(time: Date): void {
    this.currentTime = time;
  }

  advanceHours(hours: number): void {
    this.currentTime = new Date(
      this.currentTime.getTime() + hours * 60 * 60 * 1000,
    );
  }

  advanceDays(days: number): void {
    this.currentTime = new Date(
      this.currentTime.getTime() + days * 24 * 60 * 60 * 1000,
    );
  }
}

interface TestHarness {
  app: ReturnType<typeof createApp>;
  storagePort: MemoryStorageAdapter;
  loansRepository: InMemoryLoansRepository;
  loansService: LoansService;
  clock: MockClock;
  getAdminHeaders: () => Promise<Record<string, string>>;
  getMemberHeaders: () => Promise<Record<string, string>>;
  getMember2Headers: () => Promise<Record<string, string>>;
}

function createTestHarness(
  repoCustomizer?: (repo: InMemoryLoansRepository) => void,
): TestHarness {
  const clock = new MockClock(new Date('2026-11-09T03:00:00.000Z')); // 10:00 WIB on 2026-11-09
  const storagePort = new MemoryStorageAdapter();
  const loansRepository = new InMemoryLoansRepository();
  if (repoCustomizer) {
    repoCustomizer(loansRepository);
  }
  const loansService = new LoansService({
    repository: loansRepository,
    storage: storagePort,
    clock,
  });

  const app = createApp({
    loansRepository,
    loansService,
    storagePort,
    clock,
    bcryptSaltRounds: 4,
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
    storagePort,
    loansRepository,
    loansService,
    clock,
    getAdminHeaders,
    getMemberHeaders,
    getMember2Headers,
  };
}

describe('loans module - RBAC & Access Control (BE-S3-01 / SEC-02, SEC-05)', () => {
  it('GET /admin/loans returns 401 when unauthenticated and 403 for member', async () => {
    const { app, getMemberHeaders } = createTestHarness();

    // 1. Unauthenticated
    const resUnauth = await app.handle(
      new Request('http://localhost/api/v1/admin/loans'),
    );
    expect(resUnauth.status).toBe(401);
    const unauthBody = (await resUnauth.json()) as ApiErrorEnvelope;
    expect(unauthBody.code).toBe('session_not_found');

    // 2. Member role
    const memberHeaders = await getMemberHeaders();
    const resMember = await app.handle(
      new Request('http://localhost/api/v1/admin/loans', {
        headers: memberHeaders,
      }),
    );
    expect(resMember.status).toBe(403);
    const memberBody = (await resMember.json()) as ApiErrorEnvelope;
    expect(memberBody.code).toBe('forbidden');
  });

  it('GET /admin/loans/:id returns 401 when unauthenticated and 403 for member', async () => {
    const { app, getMemberHeaders } = createTestHarness();
    const validId = QA_IDS.loans.borrow0;

    // 1. Unauthenticated
    const resUnauth = await app.handle(
      new Request(`http://localhost/api/v1/admin/loans/${validId}`),
    );
    expect(resUnauth.status).toBe(401);

    // 2. Member role
    const memberHeaders = await getMemberHeaders();
    const resMember = await app.handle(
      new Request(`http://localhost/api/v1/admin/loans/${validId}`, {
        headers: memberHeaders,
      }),
    );
    expect(resMember.status).toBe(403);
  });
});

describe('loans module - GET /admin/loans (AC-06.01, Q-25)', () => {
  it('lists loans with 5 post-confirmation statuses and strictly excludes PENDING', async () => {
    const { app, getAdminHeaders } = createTestHarness();
    const adminHeaders = await getAdminHeaders();

    const res = await app.handle(
      new Request('http://localhost/api/v1/admin/loans', {
        headers: adminHeaders,
      }),
    );
    expect(res.status).toBe(200);

    const body = (await res.json()) as AdminLoansResponse;
    expect(body.pagination.page).toBe(1);
    expect(body.pagination.limit).toBe(10);
    // 10 loans in QA seed across the 5 statuses (PENDING is excluded)
    expect(body.pagination.total).toBe(10);
    expect(body.pagination.totalPages).toBe(1);
    expect(body.data.length).toBe(10);

    // Verify PENDING is never in the returned list
    const hasPending = body.data.some(
      (l) => (l.status as string) === 'PENDING',
    );
    expect(hasPending).toBe(false);

    // Verify all 5 post-confirmation statuses are present in the list
    const returnedStatuses = new Set(body.data.map((l) => l.status));
    expect(returnedStatuses.has('BORROWED')).toBe(true);
    expect(returnedStatuses.has('OVERDUE')).toBe(true);
    expect(returnedStatuses.has('RETURN_PENDING')).toBe(true);
    expect(returnedStatuses.has('FINE_PENDING')).toBe(true);
    expect(returnedStatuses.has('RETURNED')).toBe(true);
  });

  it('validates contract fields on list items', async () => {
    const { app, getAdminHeaders } = createTestHarness();
    const adminHeaders = await getAdminHeaders();

    const res = await app.handle(
      new Request('http://localhost/api/v1/admin/loans', {
        headers: adminHeaders,
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as AdminLoansResponse;

    for (const item of body.data) {
      expect(typeof item.id).toBe('string');
      expect(typeof item.loan_no).toBe('string');
      expect(typeof item.borrower_name).toBe('string');
      expect(typeof item.book_title).toBe('string');
      expect(typeof item.book_author).toBe('string');
      expect(typeof item.status).toBe('string');
      expect(typeof item.status_label).toBe('string');
      expect(typeof item.late_days).toBe('number');
      expect(typeof item.fine_status).toBe('string');
    }

    // Specific item check: QA-L-BORROW-0
    const borrowItem = body.data.find((l) => l.id === QA_IDS.loans.borrow0);
    expect(borrowItem).toBeDefined();
    expect(borrowItem?.status).toBe('BORROWED');
    expect(borrowItem?.status_label).toBe('Sedang Dipinjam');
    expect(borrowItem?.borrower_name).toBe('Member Satu');
    expect(borrowItem?.book_title).toBe('Book-B: Clean Architecture');
    expect(borrowItem?.book_cover_url).toBe('/api/v1/covers/clean-arch.jpg');
    expect(borrowItem?.due_date).toBe('2026-11-12');
    expect(borrowItem?.late_days).toBe(0);
    expect(borrowItem?.fine_amount).toBe(0);
    expect(borrowItem?.fine_status).toBe('Belum Bayar');
  });

  it('filters by each of the 5 allowed statuses and rejects PENDING status query', async () => {
    const { app, getAdminHeaders } = createTestHarness();
    const adminHeaders = await getAdminHeaders();

    // 1. Filter BORROWED
    const resBorrowed = await app.handle(
      new Request('http://localhost/api/v1/admin/loans?status=BORROWED', {
        headers: adminHeaders,
      }),
    );
    expect(resBorrowed.status).toBe(200);
    const bodyBorrowed = (await resBorrowed.json()) as AdminLoansResponse;
    expect(bodyBorrowed.data.length).toBeGreaterThanOrEqual(1);
    expect(bodyBorrowed.data.every((l) => l.status === 'BORROWED')).toBe(true);

    // 2. Filter OVERDUE
    const resOverdue = await app.handle(
      new Request('http://localhost/api/v1/admin/loans?status=OVERDUE', {
        headers: adminHeaders,
      }),
    );
    expect(resOverdue.status).toBe(200);
    const bodyOverdue = (await resOverdue.json()) as AdminLoansResponse;
    expect(bodyOverdue.data.length).toBe(4);
    expect(bodyOverdue.data.every((l) => l.status === 'OVERDUE')).toBe(true);

    // 3. Filter RETURN_PENDING
    const resRetPend = await app.handle(
      new Request('http://localhost/api/v1/admin/loans?status=RETURN_PENDING', {
        headers: adminHeaders,
      }),
    );
    expect(resRetPend.status).toBe(200);
    const bodyRetPend = (await resRetPend.json()) as AdminLoansResponse;
    expect(bodyRetPend.data.length).toBe(1);
    expect(bodyRetPend.data[0].status).toBe('RETURN_PENDING');
    expect(bodyRetPend.data[0].status_label).toBe('Pending Pengembalian');

    // 4. Filter FINE_PENDING
    const resFinePend = await app.handle(
      new Request('http://localhost/api/v1/admin/loans?status=FINE_PENDING', {
        headers: adminHeaders,
      }),
    );
    expect(resFinePend.status).toBe(200);
    const bodyFinePend = (await resFinePend.json()) as AdminLoansResponse;
    expect(bodyFinePend.data.length).toBe(2);
    expect(bodyFinePend.data.every((l) => l.status === 'FINE_PENDING')).toBe(
      true,
    );

    // 5. Filter RETURNED
    const resReturned = await app.handle(
      new Request('http://localhost/api/v1/admin/loans?status=RETURNED', {
        headers: adminHeaders,
      }),
    );
    expect(resReturned.status).toBe(200);
    const bodyReturned = (await resReturned.json()) as AdminLoansResponse;
    expect(bodyReturned.data.length).toBe(2);
    expect(bodyReturned.data.every((l) => l.status === 'RETURNED')).toBe(true);

    // 6. Reject PENDING query
    const resPending = await app.handle(
      new Request('http://localhost/api/v1/admin/loans?status=PENDING', {
        headers: adminHeaders,
      }),
    );
    expect(resPending.status).toBe(422);

    // 7. Reject invalid status query
    const resInvalid = await app.handle(
      new Request('http://localhost/api/v1/admin/loans?status=UNKNOWN', {
        headers: adminHeaders,
      }),
    );
    expect(resInvalid.status).toBe(422);
  });

  it('searches loans via q across loan_no, book_title, book_author, and borrower_name', async () => {
    const { app, getAdminHeaders } = createTestHarness();
    const adminHeaders = await getAdminHeaders();

    // 1. Search by loan_no
    const resNo = await app.handle(
      new Request('http://localhost/api/v1/admin/loans?q=0008', {
        headers: adminHeaders,
      }),
    );
    expect(resNo.status).toBe(200);
    const bodyNo = (await resNo.json()) as AdminLoansResponse;
    expect(bodyNo.data.length).toBe(1);
    expect(bodyNo.data[0].loan_no).toContain('0008');

    // 2. Search by book title substring
    const resTitle = await app.handle(
      new Request('http://localhost/api/v1/admin/loans?q=Filosofi', {
        headers: adminHeaders,
      }),
    );
    expect(resTitle.status).toBe(200);
    const bodyTitle = (await resTitle.json()) as AdminLoansResponse;
    expect(bodyTitle.data.length).toBe(1);
    expect(bodyTitle.data[0].book_title).toContain('Filosofi Teras');

    // 3. Search by book author
    const resAuthor = await app.handle(
      new Request('http://localhost/api/v1/admin/loans?q=Martin', {
        headers: adminHeaders,
      }),
    );
    expect(resAuthor.status).toBe(200);
    const bodyAuthor = (await resAuthor.json()) as AdminLoansResponse;
    expect(bodyAuthor.data.length).toBeGreaterThanOrEqual(1);

    // 4. Search by borrower name
    const resBorrower = await app.handle(
      new Request('http://localhost/api/v1/admin/loans?q=Member%20Satu', {
        headers: adminHeaders,
      }),
    );
    expect(resBorrower.status).toBe(200);
    const bodyBorrower = (await resBorrower.json()) as AdminLoansResponse;
    expect(bodyBorrower.data.length).toBe(10);

    // 5. Search with no match
    const resNone = await app.handle(
      new Request('http://localhost/api/v1/admin/loans?q=nonexistentqueryxyz', {
        headers: adminHeaders,
      }),
    );
    expect(resNone.status).toBe(200);
    const bodyNone = (await resNone.json()) as AdminLoansResponse;
    expect(bodyNone.data).toEqual([]);
    expect(bodyNone.pagination.total).toBe(0);
    expect(bodyNone.pagination.totalPages).toBe(0);
  });

  it('supports pagination page and limit and validates boundaries', async () => {
    const { app, getAdminHeaders } = createTestHarness();
    const adminHeaders = await getAdminHeaders();

    // Page 1, limit 3
    const resP1 = await app.handle(
      new Request('http://localhost/api/v1/admin/loans?page=1&limit=3', {
        headers: adminHeaders,
      }),
    );
    expect(resP1.status).toBe(200);
    const bodyP1 = (await resP1.json()) as AdminLoansResponse;
    expect(bodyP1.data.length).toBe(3);
    expect(bodyP1.pagination.page).toBe(1);
    expect(bodyP1.pagination.limit).toBe(3);
    expect(bodyP1.pagination.total).toBe(10);
    expect(bodyP1.pagination.totalPages).toBe(4);

    // Page 4 (last page: 1 item left)
    const resP4 = await app.handle(
      new Request('http://localhost/api/v1/admin/loans?page=4&limit=3', {
        headers: adminHeaders,
      }),
    );
    expect(resP4.status).toBe(200);
    const bodyP4 = (await resP4.json()) as AdminLoansResponse;
    expect(bodyP4.data.length).toBe(1);

    // Invalid limits
    const resLimit0 = await app.handle(
      new Request('http://localhost/api/v1/admin/loans?limit=0', {
        headers: adminHeaders,
      }),
    );
    expect(resLimit0.status).toBe(422);

    const resLimit51 = await app.handle(
      new Request('http://localhost/api/v1/admin/loans?limit=51', {
        headers: adminHeaders,
      }),
    );
    expect(resLimit51.status).toBe(422);

    const resPage0 = await app.handle(
      new Request('http://localhost/api/v1/admin/loans?page=0', {
        headers: adminHeaders,
      }),
    );
    expect(resPage0.status).toBe(422);
  });

  it('verifies fine_amount calculation in list across boundary days', async () => {
    const { app, getAdminHeaders } = createTestHarness();
    const adminHeaders = await getAdminHeaders();

    const res = await app.handle(
      new Request('http://localhost/api/v1/admin/loans?limit=50', {
        headers: adminHeaders,
      }),
    );
    expect(res.status).toBe(200);
    const body = (await res.json()) as AdminLoansResponse;

    // late_days = 0 -> fine_amount = 0
    const loan0 = body.data.find((l) => l.id === QA_IDS.loans.borrow0);
    expect(loan0?.late_days).toBe(0);
    expect(loan0?.fine_amount).toBe(0);

    // late_days = 1 -> fine_amount = 2000 flat
    const loan1 = body.data.find((l) => l.id === QA_IDS.loans.over1);
    expect(loan1?.late_days).toBe(1);
    expect(loan1?.fine_amount).toBe(2000);

    // late_days = 4 -> fine_amount = 2000 flat
    const loan4 = body.data.find((l) => l.id === QA_IDS.loans.over4);
    expect(loan4?.late_days).toBe(4);
    expect(loan4?.fine_amount).toBe(2000);

    // late_days = 5, Belum Bayar -> fine_amount = null
    const loan5 = body.data.find((l) => l.id === QA_IDS.loans.over5);
    expect(loan5?.late_days).toBe(5);
    expect(loan5?.fine_amount).toBeNull();

    // late_days = 6, Belum Bayar -> fine_amount = null
    const loan6 = body.data.find((l) => l.id === QA_IDS.loans.over6);
    expect(loan6?.late_days).toBe(6);
    expect(loan6?.fine_amount).toBeNull();

    // late_days = 5, Sudah Bayar -> fine_amount = 15000 (recorded amount)
    const loanPaid = body.data.find((l) => l.id === QA_IDS.loans.finePaid);
    expect(loanPaid?.late_days).toBe(5);
    expect(loanPaid?.fine_status).toBe('Sudah Bayar');
    expect(loanPaid?.fine_amount).toBe(15000);
  });
});

describe('loans module - GET /admin/loans/:id (AC-06.02, AC-09.03, AC-09.04, AC-09.05, AC-09.08)', () => {
  it('returns 404 for invalid UUID and non-existent loan ID', async () => {
    const { app, getAdminHeaders } = createTestHarness();
    const adminHeaders = await getAdminHeaders();

    // Invalid UUID
    const resInvalid = await app.handle(
      new Request('http://localhost/api/v1/admin/loans/not-a-uuid', {
        headers: adminHeaders,
      }),
    );
    expect(resInvalid.status).toBe(404);
    const bodyInvalid = (await resInvalid.json()) as ApiErrorEnvelope;
    expect(bodyInvalid.message).toBe('Peminjaman tidak ditemukan.');

    // Non-existent UUID
    const resNonExistent = await app.handle(
      new Request(
        'http://localhost/api/v1/admin/loans/00000000-0000-4000-8003-999999999999',
        { headers: adminHeaders },
      ),
    );
    expect(resNonExistent.status).toBe(404);
    const bodyNonExistent = (await resNonExistent.json()) as ApiErrorEnvelope;
    expect(bodyNonExistent.message).toBe('Peminjaman tidak ditemukan.');
  });

  it('returns complete loan detail with borrower, book, genres, and metadata', async () => {
    const { app, getAdminHeaders } = createTestHarness();
    const adminHeaders = await getAdminHeaders();

    const res = await app.handle(
      new Request(
        `http://localhost/api/v1/admin/loans/${QA_IDS.loans.finePend}`,
        { headers: adminHeaders },
      ),
    );
    expect(res.status).toBe(200);

    const body = (await res.json()) as AdminLoanDetailResponse;
    const loan = body.data;

    expect(loan.id).toBe(QA_IDS.loans.finePend);
    expect(loan.loan_no).toBe('PJM-20261109-0008');
    expect(loan.status).toBe('FINE_PENDING');
    expect(loan.status_label).toBe('Pending Keterlambatan');

    // Borrower details
    expect(loan.borrower.id).toBe(QA_IDS.users.member1);
    expect(loan.borrower.full_name).toBe('Member Satu');
    expect(loan.borrower.email).toBe('member1@readonly.ppu.co.id');

    // Book details
    expect(loan.book.id).toBe(QA_IDS.books.bookH);
    expect(loan.book.title).toBe('Book-H: Laut Bercerita');
    expect(loan.book.author).toBe('Leila S. Chudori');
    expect(loan.book.publisher).toBe('KPG');
    expect(loan.book.publication_year).toBe(2017);
    expect(loan.book.synopsis).toBe(
      'Buku H berstatus Pending Keterlambatan Belum Bayar.',
    );
    expect(loan.book.cover_url).toBe('/api/v1/covers/laut-bercerita.jpg');
    expect(loan.book.genres).toEqual(['Drama', 'Fiksi']);

    // Date fields
    expect(loan.due_date).toBe('2026-11-04');
    expect(typeof loan.confirmed_at).toBe('string');
    expect(typeof loan.return_requested_at).toBe('string');

    // Fine and action flags (FINE_PENDING, Belum Bayar)
    expect(loan.late_days).toBe(5);
    expect(loan.fine_amount).toBeNull();
    expect(loan.fine_status).toBe('Belum Bayar');
    expect(loan.can_pay_fine).toBe(true);
    expect(loan.can_confirm_return).toBe(false);
  });

  it('sets action flags correctly across all loan statuses (AC-09.03, AC-09.04, AC-09.05)', async () => {
    const { app, getAdminHeaders } = createTestHarness();
    const adminHeaders = await getAdminHeaders();

    const fetchDetail = async (id: string) => {
      const res = await app.handle(
        new Request(`http://localhost/api/v1/admin/loans/${id}`, {
          headers: adminHeaders,
        }),
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as AdminLoanDetailResponse;
      return body.data;
    };

    // 1. RETURN_PENDING: can_pay_fine = false, can_confirm_return = true (AC-09.03)
    const retPend = await fetchDetail(QA_IDS.loans.retPend);
    expect(retPend.status).toBe('RETURN_PENDING');
    expect(retPend.can_pay_fine).toBe(false);
    expect(retPend.can_confirm_return).toBe(true);

    // 2. FINE_PENDING with Belum Bayar: can_pay_fine = true, can_confirm_return = false (AC-09.04)
    const finePend = await fetchDetail(QA_IDS.loans.finePend);
    expect(finePend.status).toBe('FINE_PENDING');
    expect(finePend.fine_status).toBe('Belum Bayar');
    expect(finePend.can_pay_fine).toBe(true);
    expect(finePend.can_confirm_return).toBe(false);

    // 3. FINE_PENDING with Sudah Bayar: can_pay_fine = false, can_confirm_return = true (AC-09.05)
    const finePaid = await fetchDetail(QA_IDS.loans.finePaid);
    expect(finePaid.status).toBe('FINE_PENDING');
    expect(finePaid.fine_status).toBe('Sudah Bayar');
    expect(finePaid.can_pay_fine).toBe(false);
    expect(finePaid.can_confirm_return).toBe(true);

    // 4. BORROWED: can_pay_fine = false, can_confirm_return = false
    const borrowed = await fetchDetail(QA_IDS.loans.borrow0);
    expect(borrowed.status).toBe('BORROWED');
    expect(borrowed.can_pay_fine).toBe(false);
    expect(borrowed.can_confirm_return).toBe(false);

    // 5. OVERDUE: can_pay_fine = false, can_confirm_return = false
    const overdue = await fetchDetail(QA_IDS.loans.over1);
    expect(overdue.status).toBe('OVERDUE');
    expect(overdue.can_pay_fine).toBe(false);
    expect(overdue.can_confirm_return).toBe(false);

    // 6. RETURNED: can_pay_fine = false, can_confirm_return = false
    const returned = await fetchDetail(QA_IDS.loans.returnedOn);
    expect(returned.status).toBe('RETURNED');
    expect(returned.can_pay_fine).toBe(false);
    expect(returned.can_confirm_return).toBe(false);
  });

  it('calculates fine_amount in detail for 1-4 days (flat 2000) and >= 5 days (null until paid) (AC-06.02, AC-09.08)', async () => {
    const { app, getAdminHeaders } = createTestHarness();
    const adminHeaders = await getAdminHeaders();

    const fetchDetail = async (id: string) => {
      const res = await app.handle(
        new Request(`http://localhost/api/v1/admin/loans/${id}`, {
          headers: adminHeaders,
        }),
      );
      expect(res.status).toBe(200);
      const body = (await res.json()) as AdminLoanDetailResponse;
      return body.data;
    };

    // late_days = 1 -> fine_amount = 2000
    const over1 = await fetchDetail(QA_IDS.loans.over1);
    expect(over1.late_days).toBe(1);
    expect(over1.fine_amount).toBe(2000);

    // late_days = 4 -> fine_amount = 2000
    const over4 = await fetchDetail(QA_IDS.loans.over4);
    expect(over4.late_days).toBe(4);
    expect(over4.fine_amount).toBe(2000);

    // late_days = 5, Belum Bayar -> fine_amount = null (AC-06.02)
    const over5 = await fetchDetail(QA_IDS.loans.over5);
    expect(over5.late_days).toBe(5);
    expect(over5.fine_amount).toBeNull();

    // late_days = 6, Belum Bayar -> fine_amount = null (AC-06.02)
    const over6 = await fetchDetail(QA_IDS.loans.over6);
    expect(over6.late_days).toBe(6);
    expect(over6.fine_amount).toBeNull();

    // late_days = 5, Sudah Bayar -> fine_amount = 15000 (recorded amount)
    const finePaid = await fetchDetail(QA_IDS.loans.finePaid);
    expect(finePaid.late_days).toBe(5);
    expect(finePaid.fine_amount).toBe(15000);
  });
});

describe('loans module - DrizzleLoansRepository', () => {
  it('returns empty list and total 0 when count is 0 in DrizzleLoansRepository', async () => {
    const fakeDb = {
      select() {
        return {
          from() {
            return {
              innerJoin() {
                return {
                  innerJoin() {
                    return {
                      where() {
                        return Promise.resolve([{ count: 0 }]);
                      },
                    };
                  },
                };
              },
            };
          },
        };
      },
    } as unknown as Database;

    const repo = new DrizzleLoansRepository(fakeDb);
    const result = await repo.listAdminLoans({ page: 1, limit: 10 });
    expect(result.items).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('returns null when loan is not found in DrizzleLoansRepository', async () => {
    const fakeDb = {
      select() {
        return {
          from() {
            return {
              innerJoin() {
                return {
                  innerJoin() {
                    return {
                      where() {
                        return Promise.resolve([]);
                      },
                    };
                  },
                };
              },
            };
          },
        };
      },
    } as unknown as Database;

    const repo = new DrizzleLoansRepository(fakeDb);
    const result = await repo.findAdminLoanById(
      '00000000-0000-4000-8003-000000000001',
    );
    expect(result).toBeNull();
  });

  it('DrizzleLoansRepository findOverdueCandidateLoans and transitionToOverdue interact with database correctly', async () => {
    let updateCalled = false;
    let eventInserted = false;
    let notifInserted = false;

    const fakeDb = {
      select: () => ({
        from: () => ({
          innerJoin: () => ({
            where: () => ({
              orderBy: async () => [],
            }),
          }),
        }),
      }),
      transaction: async (fn: (tx: unknown) => unknown) => {
        const fakeTx = {
          update: () => ({
            set: () => ({
              where: async () => {
                updateCalled = true;
              },
            }),
          }),
          insert: () => ({
            values: () => {
              eventInserted = true;
              return {
                onConflictDoNothing: async () => {
                  notifInserted = true;
                },
              };
            },
          }),
        };
        return await fn(fakeTx);
      },
    } as unknown as Database;

    const repo = new DrizzleLoansRepository(fakeDb);

    const candidates = await repo.findOverdueCandidateLoans('2026-11-09');
    expect(candidates).toEqual([]);

    await repo.transitionToOverdue({
      loanId: '00000000-0000-4000-8003-000000000002',
      lateDays: 1,
      fineAmount: 2000,
      now: new Date(),
      bookTitle: 'Test Book',
      userId: '00000000-0000-4000-8000-000000000002',
      dueDate: '2026-11-08',
    });

    expect(updateCalled).toBe(true);
    expect(eventInserted).toBe(true);
    expect(notifInserted).toBe(true);
  });

  it('DrizzleLoansRepository findPendingLoanByQrHash returns null when not found', async () => {
    const fakeDb = {
      select: () => ({
        from: () => ({
          innerJoin: () => ({
            innerJoin: () => ({
              where: async () => [],
            }),
          }),
        }),
      }),
    } as unknown as Database;

    const repo = new DrizzleLoansRepository(fakeDb);
    const result = await repo.findPendingLoanByQrHash('dummy-hash');
    expect(result).toBeNull();
  });

  it('DrizzleLoansRepository findPendingLoanByQrHash returns loan details when found', async () => {
    let callCount = 0;
    const makeJoinObj = () => ({
      innerJoin: () => makeJoinObj(),
      where: () => {
        callCount += 1;
        if (callCount === 1) {
          return Promise.resolve([
            {
              loanId: '00000000-0000-4000-8003-000000000001',
              loanNo: 'PJM-20261109-0001',
              requestedAt: new Date('2026-11-09T03:00:00.000Z'),
              borrowerName: 'Member Satu',
              bookId: '00000000-0000-4000-8002-000000000001',
              bookTitle: 'Clean Code',
              bookAuthor: 'Robert C. Martin',
              bookPublisher: 'Prentice Hall',
              bookPublicationYear: 2008,
              bookCoverPath: 'clean-code.jpg',
            },
          ]);
        }
        return {
          orderBy: async () => [{ name: 'Teknologi' }],
        };
      },
    });

    const fakeDb = {
      select: () => ({
        from: () => ({
          innerJoin: () => makeJoinObj(),
        }),
      }),
    } as unknown as Database;

    const repo = new DrizzleLoansRepository(fakeDb);
    const result = await repo.findPendingLoanByQrHash('sample-hash');
    expect(result).not.toBeNull();
    expect(result?.loanId).toBe('00000000-0000-4000-8003-000000000001');
    expect(result?.borrowerName).toBe('Member Satu');
    expect(result?.book.genres).toEqual(['Teknologi']);
  });

  it('DrizzleLoansRepository confirmPendingLoan handles success and error paths', async () => {
    // 1. Throws invalid_token when loan is not found or not pending
    const fakeDbNotFound = {
      transaction: async (fn: (tx: unknown) => unknown) => {
        const fakeTx = {
          select: () => ({
            from: () => ({
              where: () => ({
                for: async () => [],
              }),
            }),
          }),
        };
        return await fn(fakeTx);
      },
    } as unknown as Database;

    const repoNotFound = new DrizzleLoansRepository(fakeDbNotFound);
    expect(
      repoNotFound.confirmPendingLoan({
        loanId: '00000000-0000-4000-8003-000000000001',
        adminId: '00000000-0000-4000-8001-000000000001',
        now: new Date(),
        dueDate: '2026-11-16',
      }),
    ).rejects.toThrow('QR Code tidak valid');

    // 2. Throws conflict when book conditional decrement returns 0 rows (stock 0)
    const fakeDbStockZero = {
      transaction: async (fn: (tx: unknown) => unknown) => {
        const fakeTx = {
          select: () => ({
            from: () => ({
              where: () => ({
                for: async () => [
                  {
                    id: '00000000-0000-4000-8003-000000000001',
                    bookId: '00000000-0000-4000-8002-000000000001',
                  },
                ],
              }),
            }),
          }),
          update: () => ({
            set: () => ({
              where: () => ({
                returning: async () => [],
              }),
            }),
          }),
        };
        return await fn(fakeTx);
      },
    } as unknown as Database;

    const repoStockZero = new DrizzleLoansRepository(fakeDbStockZero);
    expect(
      repoStockZero.confirmPendingLoan({
        loanId: '00000000-0000-4000-8003-000000000001',
        adminId: '00000000-0000-4000-8001-000000000001',
        now: new Date(),
        dueDate: '2026-11-16',
      }),
    ).rejects.toThrow('Buku tidak tersedia (stok habis)');

    // 3. Success path
    let loanUpdated = false;
    let eventInserted = false;
    const fakeDbSuccess = {
      transaction: async (fn: (tx: unknown) => unknown) => {
        const fakeTx = {
          select: () => ({
            from: () => ({
              where: () => ({
                for: async () => [
                  {
                    id: '00000000-0000-4000-8003-000000000001',
                    bookId: '00000000-0000-4000-8002-000000000001',
                  },
                ],
              }),
            }),
          }),
          update: () => ({
            set: () => ({
              where: () => ({
                returning: async () => {
                  loanUpdated = true;
                  return [{ id: '00000000-0000-4000-8003-000000000001' }];
                },
              }),
            }),
          }),
          insert: () => ({
            values: async () => {
              eventInserted = true;
            },
          }),
        };
        return await fn(fakeTx);
      },
    } as unknown as Database;

    const repoSuccess = new DrizzleLoansRepository(fakeDbSuccess);
    const result = await repoSuccess.confirmPendingLoan({
      loanId: '00000000-0000-4000-8003-000000000001',
      adminId: '00000000-0000-4000-8001-000000000001',
      now: new Date(),
      dueDate: '2026-11-16',
    });

    expect(result.status).toBe('BORROWED');
    expect(result.dueDate).toBe('2026-11-16');
    expect(loanUpdated).toBe(true);
    expect(eventInserted).toBe(true);
  });

  it('DrizzleLoansRepository returnLoanOnTime handles success and error paths', async () => {
    // 1. Throws not_found when loan is not found
    const fakeDbNotFound = {
      transaction: async (fn: (tx: unknown) => unknown) => {
        const fakeTx = {
          select: () => ({
            from: () => ({
              where: () => ({
                for: async () => [],
              }),
            }),
          }),
        };
        return await fn(fakeTx);
      },
    } as unknown as Database;

    const repoNotFound = new DrizzleLoansRepository(fakeDbNotFound);
    expect(
      repoNotFound.returnLoanOnTime({
        loanId: '00000000-0000-4000-8003-000000000001',
        bookId: '00000000-0000-4000-8002-000000000001',
        userId: '00000000-0000-4000-8001-000000000001',
        score: 5,
        now: new Date(),
      }),
    ).rejects.toThrow('Peminjaman tidak ditemukan.');

    // 2. Throws invalid_state_transition when loan is not BORROWED
    const fakeDbNotBorrowed = {
      transaction: async (fn: (tx: unknown) => unknown) => {
        const fakeTx = {
          select: () => ({
            from: () => ({
              where: () => ({
                for: async () => [
                  {
                    id: '00000000-0000-4000-8003-000000000001',
                    bookId: '00000000-0000-4000-8002-000000000001',
                    userId: '00000000-0000-4000-8001-000000000001',
                    status: 'PENDING',
                  },
                ],
              }),
            }),
          }),
        };
        return await fn(fakeTx);
      },
    } as unknown as Database;

    const repoNotBorrowed = new DrizzleLoansRepository(fakeDbNotBorrowed);
    expect(
      repoNotBorrowed.returnLoanOnTime({
        loanId: '00000000-0000-4000-8003-000000000001',
        bookId: '00000000-0000-4000-8002-000000000001',
        userId: '00000000-0000-4000-8001-000000000001',
        score: 5,
        now: new Date(),
      }),
    ).rejects.toThrow('Peminjaman bukan berstatus Sedang Dipinjam.');

    // 3. Success path
    let loanUpdated = false;
    let ratingInserted = false;
    let eventInserted = false;
    const fakeDbSuccess = {
      transaction: async (fn: (tx: unknown) => unknown) => {
        const fakeTx = {
          select: () => ({
            from: () => ({
              where: () => ({
                for: async () => [
                  {
                    id: '00000000-0000-4000-8003-000000000001',
                    bookId: '00000000-0000-4000-8002-000000000001',
                    userId: '00000000-0000-4000-8001-000000000001',
                    status: 'BORROWED',
                  },
                ],
              }),
            }),
          }),
          update: () => ({
            set: () => ({
              where: () => ({
                returning: async () => {
                  loanUpdated = true;
                  return [{ id: '00000000-0000-4000-8003-000000000001' }];
                },
              }),
            }),
          }),
          insert: () => ({
            values: async () => {
              if (!ratingInserted) {
                ratingInserted = true;
              } else {
                eventInserted = true;
              }
            },
          }),
        };
        return await fn(fakeTx);
      },
    } as unknown as Database;

    const repoSuccess = new DrizzleLoansRepository(fakeDbSuccess);
    await repoSuccess.returnLoanOnTime({
      loanId: '00000000-0000-4000-8003-000000000001',
      bookId: '00000000-0000-4000-8002-000000000001',
      userId: '00000000-0000-4000-8001-000000000001',
      score: 5,
      now: new Date(),
    });

    expect(loanUpdated).toBe(true);
    expect(ratingInserted).toBe(true);
    expect(eventInserted).toBe(true);
  });

  it('DrizzleLoansRepository returnLoanOverdue handles success and error paths', async () => {
    const fakeDbNotOverdue = {
      transaction: async (fn: (tx: unknown) => unknown) => {
        const fakeTx = {
          select: () => ({
            from: () => ({
              where: () => ({
                for: async () => [
                  {
                    id: '00000000-0000-4000-8003-000000000001',
                    bookId: '00000000-0000-4000-8002-000000000001',
                    userId: '00000000-0000-4000-8001-000000000001',
                    status: 'BORROWED',
                  },
                ],
              }),
            }),
          }),
        };
        return await fn(fakeTx);
      },
    } as unknown as Database;

    const repoNotOverdue = new DrizzleLoansRepository(fakeDbNotOverdue);
    expect(
      repoNotOverdue.returnLoanOverdue({
        loanId: '00000000-0000-4000-8003-000000000001',
        bookId: '00000000-0000-4000-8002-000000000001',
        userId: '00000000-0000-4000-8001-000000000001',
        score: 4,
        lateDays: 1,
        fineAmount: 2000,
        now: new Date(),
      }),
    ).rejects.toThrow('Peminjaman bukan berstatus Terlambat.');

    let loanUpdated = false;
    let ratingInserted = false;
    let eventInserted = false;
    const fakeDbSuccess = {
      transaction: async (fn: (tx: unknown) => unknown) => {
        const fakeTx = {
          select: () => ({
            from: () => ({
              where: () => ({
                for: async () => [
                  {
                    id: '00000000-0000-4000-8003-000000000001',
                    bookId: '00000000-0000-4000-8002-000000000001',
                    userId: '00000000-0000-4000-8001-000000000001',
                    status: 'OVERDUE',
                  },
                ],
              }),
            }),
          }),
          update: () => ({
            set: () => ({
              where: () => ({
                returning: async () => {
                  loanUpdated = true;
                  return [{ id: '00000000-0000-4000-8003-000000000001' }];
                },
              }),
            }),
          }),
          insert: () => ({
            values: async () => {
              if (!ratingInserted) {
                ratingInserted = true;
              } else {
                eventInserted = true;
              }
            },
          }),
        };
        return await fn(fakeTx);
      },
    } as unknown as Database;

    const repoSuccess = new DrizzleLoansRepository(fakeDbSuccess);
    await repoSuccess.returnLoanOverdue({
      loanId: '00000000-0000-4000-8003-000000000001',
      bookId: '00000000-0000-4000-8002-000000000001',
      userId: '00000000-0000-4000-8001-000000000001',
      score: 4,
      lateDays: 1,
      fineAmount: 2000,
      now: new Date(),
    });

    expect(loanUpdated).toBe(true);
    expect(ratingInserted).toBe(true);
    expect(eventInserted).toBe(true);
  });

  it('DrizzleLoansRepository payFine handles success and error paths', async () => {
    const fakeDbPaid = {
      transaction: async (fn: (tx: unknown) => unknown) => {
        const fakeTx = {
          select: () => ({
            from: () => ({
              where: () => ({
                for: async () => [
                  {
                    id: '00000000-0000-4000-8003-000000000001',
                    status: 'FINE_PENDING',
                    fineStatus: 'Sudah Bayar',
                  },
                ],
              }),
            }),
          }),
        };
        return await fn(fakeTx);
      },
    } as unknown as Database;

    const repoPaid = new DrizzleLoansRepository(fakeDbPaid);
    expect(
      repoPaid.payFine({
        loanId: '00000000-0000-4000-8003-000000000001',
        adminId: '00000000-0000-4000-8001-000000000001',
        fineAmount: 2000,
        now: new Date(),
      }),
    ).rejects.toThrow(
      'Peminjaman bukan berstatus Pending Keterlambatan atau denda sudah dibayar.',
    );

    let loanUpdated = false;
    let eventInserted = false;
    const fakeDbSuccess = {
      transaction: async (fn: (tx: unknown) => unknown) => {
        const fakeTx = {
          select: () => ({
            from: () => ({
              where: () => ({
                for: async () => [
                  {
                    id: '00000000-0000-4000-8003-000000000001',
                    status: 'FINE_PENDING',
                    fineStatus: 'Belum Bayar',
                  },
                ],
              }),
            }),
          }),
          update: () => ({
            set: () => ({
              where: () => ({
                returning: async () => {
                  loanUpdated = true;
                  return [{ id: '00000000-0000-4000-8003-000000000001' }];
                },
              }),
            }),
          }),
          insert: () => ({
            values: async () => {
              eventInserted = true;
            },
          }),
        };
        return await fn(fakeTx);
      },
    } as unknown as Database;

    const repoSuccess = new DrizzleLoansRepository(fakeDbSuccess);
    await repoSuccess.payFine({
      loanId: '00000000-0000-4000-8003-000000000001',
      adminId: '00000000-0000-4000-8001-000000000001',
      fineAmount: 2000,
      now: new Date(),
    });

    expect(loanUpdated).toBe(true);
    expect(eventInserted).toBe(true);
  });

  it('DrizzleLoansRepository confirmReturn handles success, fine guard, and stock increment', async () => {
    // 1. Rejects when FINE_PENDING and Belum Bayar
    const fakeDbUnpaidFine = {
      transaction: async (fn: (tx: unknown) => unknown) => {
        const fakeTx = {
          select: () => ({
            from: () => ({
              where: () => ({
                for: async () => [
                  {
                    id: '00000000-0000-4000-8003-000000000001',
                    bookId: '00000000-0000-4000-8002-000000000001',
                    status: 'FINE_PENDING',
                    fineStatus: 'Belum Bayar',
                  },
                ],
              }),
            }),
          }),
        };
        return await fn(fakeTx);
      },
    } as unknown as Database;

    const repoUnpaid = new DrizzleLoansRepository(fakeDbUnpaidFine);
    expect(
      repoUnpaid.confirmReturn({
        loanId: '00000000-0000-4000-8003-000000000001',
        bookId: '00000000-0000-4000-8002-000000000001',
        adminId: '00000000-0000-4000-8001-000000000001',
        previousStatus: 'FINE_PENDING',
        now: new Date(),
      }),
    ).rejects.toThrow('Denda belum dibayar.');

    // 2. Success path
    let loanUpdated = false;
    let stockIncremented = false;
    let eventInserted = false;
    const fakeDbSuccess = {
      transaction: async (fn: (tx: unknown) => unknown) => {
        const fakeTx = {
          select: () => ({
            from: () => ({
              where: () => ({
                for: async () => [
                  {
                    id: '00000000-0000-4000-8003-000000000001',
                    bookId: '00000000-0000-4000-8002-000000000001',
                    status: 'RETURN_PENDING',
                    fineStatus: 'Belum Bayar',
                  },
                ],
              }),
            }),
          }),
          update: () => ({
            set: () => ({
              where: () => {
                if (!loanUpdated) {
                  return {
                    returning: async () => {
                      loanUpdated = true;
                      return [{ id: '00000000-0000-4000-8003-000000000001' }];
                    },
                  };
                }
                stockIncremented = true;
                return Promise.resolve();
              },
            }),
          }),
          insert: () => ({
            values: async () => {
              eventInserted = true;
            },
          }),
        };
        return await fn(fakeTx);
      },
    } as unknown as Database;

    const repoSuccess = new DrizzleLoansRepository(fakeDbSuccess);
    await repoSuccess.confirmReturn({
      loanId: '00000000-0000-4000-8003-000000000001',
      bookId: '00000000-0000-4000-8002-000000000001',
      adminId: '00000000-0000-4000-8001-000000000001',
      previousStatus: 'RETURN_PENDING',
      now: new Date(),
    });

    expect(loanUpdated).toBe(true);
    expect(stockIncremented).toBe(true);
    expect(eventInserted).toBe(true);
  });
});

describe('loans module - QR preview & confirm RBAC & Rate Limiting (BE-S2-03 / SEC-02, SEC-05, SEC-06)', () => {
  it('POST /admin/loans/qr/preview returns 401 when unauthenticated and 403 for member', async () => {
    const { app, getMemberHeaders } = createTestHarness();

    const resUnauth = await app.handle(
      new Request('http://localhost/api/v1/admin/loans/qr/preview', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ qr_token: QA_PENDING_QR_TOKEN }),
      }),
    );
    expect(resUnauth.status).toBe(401);

    const memberHeaders = await getMemberHeaders();
    const resMember = await app.handle(
      new Request('http://localhost/api/v1/admin/loans/qr/preview', {
        method: 'POST',
        headers: {
          ...memberHeaders,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ qr_token: QA_PENDING_QR_TOKEN }),
      }),
    );
    expect(resMember.status).toBe(403);
  });

  it('POST /admin/loans/qr/confirm returns 401 when unauthenticated and 403 for member', async () => {
    const { app, getMemberHeaders } = createTestHarness();

    const resUnauth = await app.handle(
      new Request('http://localhost/api/v1/admin/loans/qr/confirm', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ qr_token: QA_PENDING_QR_TOKEN }),
      }),
    );
    expect(resUnauth.status).toBe(401);

    const memberHeaders = await getMemberHeaders();
    const resMember = await app.handle(
      new Request('http://localhost/api/v1/admin/loans/qr/confirm', {
        method: 'POST',
        headers: {
          ...memberHeaders,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ qr_token: QA_PENDING_QR_TOKEN }),
      }),
    );
    expect(resMember.status).toBe(403);
  });

  it('POST /admin/loans/qr/preview enforces rate limit per IP (SEC-06)', async () => {
    const loansRepository = new InMemoryLoansRepository();
    const storagePort = new MemoryStorageAdapter();
    const loansService = new LoansService({
      repository: loansRepository,
      storage: storagePort,
    });
    const app = createApp({
      loansRepository,
      loansService,
      storagePort,
      qrRateLimitMax: 2,
      bcryptSaltRounds: 4,
    });

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
    const loginBody = (await loginRes.json()) as { data: { token: string } };
    const adminHeaders = {
      cookie: `readonly_session=${loginBody.data.token}`,
      'content-type': 'application/json',
      'x-forwarded-for': '192.168.1.100',
    };

    const res1 = await app.handle(
      new Request('http://localhost/api/v1/admin/loans/qr/preview', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ qr_token: QA_PENDING_QR_TOKEN }),
      }),
    );
    expect(res1.status).toBe(200);

    const res2 = await app.handle(
      new Request('http://localhost/api/v1/admin/loans/qr/preview', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ qr_token: QA_PENDING_QR_TOKEN }),
      }),
    );
    expect(res2.status).toBe(200);

    const res3 = await app.handle(
      new Request('http://localhost/api/v1/admin/loans/qr/preview', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ qr_token: QA_PENDING_QR_TOKEN }),
      }),
    );
    expect(res3.status).toBe(429);
    const body3 = (await res3.json()) as ApiErrorEnvelope;
    expect(body3.code).toBe('rate_limit_exceeded');
  });
});

describe('loans module - POST /admin/loans/qr/preview (BE-S2-03 / AC-08.03, AC-08.06)', () => {
  it('previews pending loan with valid QR token without mutating state or stock', async () => {
    const { app, loansRepository, getAdminHeaders } = createTestHarness();
    const adminHeaders = await getAdminHeaders();

    const bookBefore = loansRepository.getBook(QA_IDS.books.bookB);
    const stockBefore = bookBefore?.availableCount ?? 0;

    const res = await app.handle(
      new Request('http://localhost/api/v1/admin/loans/qr/preview', {
        method: 'POST',
        headers: {
          ...adminHeaders,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ qr_token: QA_PENDING_QR_TOKEN }),
      }),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as QrPreviewResponse;
    expect(body.data.loan_id).toBe(QA_IDS.loans.pending);
    expect(body.data.loan_no).toBe('PJM-20261109-0001');
    expect(body.data.borrower_name).toBe('Member Satu');
    expect(body.data.loan_duration_days).toBe(7);
    expect(body.data.book.id).toBe(QA_IDS.books.bookB);
    expect(body.data.book.title).toBe('Book-B: Clean Architecture');
    expect(body.data.book.author).toBe('Robert C. Martin');
    expect(body.data.book.publisher).toBe('Prentice Hall');
    expect(body.data.book.publication_year).toBe(2017);
    expect(Array.isArray(body.data.book.genres)).toBe(true);

    const bookAfter = loansRepository.getBook(QA_IDS.books.bookB);
    expect(bookAfter?.availableCount).toBe(stockBefore);
    const pendingLoan = loansRepository
      .getLoans()
      .find((l) => l.id === QA_IDS.loans.pending);
    expect(pendingLoan?.status).toBe('PENDING');
    expect(pendingLoan?.qrConsumedAt).toBeNull();
  });

  it('rejects invalid or unknown QR token with 422 verbatim AC-08.06 message', async () => {
    const { app, getAdminHeaders } = createTestHarness();
    const adminHeaders = await getAdminHeaders();

    const res = await app.handle(
      new Request('http://localhost/api/v1/admin/loans/qr/preview', {
        method: 'POST',
        headers: {
          ...adminHeaders,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ qr_token: 'non-existent-token' }),
      }),
    );

    expect(res.status).toBe(422);
    const body = (await res.json()) as ApiErrorEnvelope;
    expect(body.code).toBe('invalid_token');
    expect(body.message).toBe('QR Code tidak valid');
  });

  it('rejects already-consumed QR token with 422 verbatim AC-08.06 message', async () => {
    const { app, loansRepository, getAdminHeaders } = createTestHarness();
    const adminHeaders = await getAdminHeaders();

    const pendingLoan = loansRepository
      .getLoans()
      .find((l) => l.id === QA_IDS.loans.pending);
    if (pendingLoan) {
      pendingLoan.qrConsumedAt = new Date();
    }

    const res = await app.handle(
      new Request('http://localhost/api/v1/admin/loans/qr/preview', {
        method: 'POST',
        headers: {
          ...adminHeaders,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ qr_token: QA_PENDING_QR_TOKEN }),
      }),
    );

    expect(res.status).toBe(422);
    const body = (await res.json()) as ApiErrorEnvelope;
    expect(body.code).toBe('invalid_token');
    expect(body.message).toBe('QR Code tidak valid');
  });

  it('rejects QR token when loan status is not PENDING with 422 verbatim AC-08.06 message', async () => {
    const { app, loansRepository, getAdminHeaders } = createTestHarness();
    const adminHeaders = await getAdminHeaders();

    const pendingLoan = loansRepository
      .getLoans()
      .find((l) => l.id === QA_IDS.loans.pending);
    if (pendingLoan) {
      pendingLoan.status = 'BORROWED';
    }

    const res = await app.handle(
      new Request('http://localhost/api/v1/admin/loans/qr/preview', {
        method: 'POST',
        headers: {
          ...adminHeaders,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ qr_token: QA_PENDING_QR_TOKEN }),
      }),
    );

    expect(res.status).toBe(422);
    const body = (await res.json()) as ApiErrorEnvelope;
    expect(body.code).toBe('invalid_token');
    expect(body.message).toBe('QR Code tidak valid');
  });

  it('rejects empty or malformed request body with 422 verbatim AC-08.06 message', async () => {
    const { app, getAdminHeaders } = createTestHarness();
    const adminHeaders = await getAdminHeaders();

    const resEmpty = await app.handle(
      new Request('http://localhost/api/v1/admin/loans/qr/preview', {
        method: 'POST',
        headers: {
          ...adminHeaders,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ qr_token: '' }),
      }),
    );
    expect(resEmpty.status).toBe(422);
    const bodyEmpty = (await resEmpty.json()) as ApiErrorEnvelope;
    expect(bodyEmpty.code).toBe('invalid_token');
    expect(bodyEmpty.message).toBe('QR Code tidak valid');

    const resNoBody = await app.handle(
      new Request('http://localhost/api/v1/admin/loans/qr/preview', {
        method: 'POST',
        headers: {
          ...adminHeaders,
          'content-type': 'application/json',
        },
        body: JSON.stringify({}),
      }),
    );
    expect(resNoBody.status).toBe(422);
    const bodyNoBody = (await resNoBody.json()) as ApiErrorEnvelope;
    expect(bodyNoBody.code).toBe('invalid_token');
  });
});

describe('loans module - POST /admin/loans/qr/confirm (BE-S2-03 / AC-08.03, AC-08.06, Q-15)', () => {
  it('confirms loan, transitions to BORROWED, decrements stock atomically, and logs event', async () => {
    const { app, loansRepository, getAdminHeaders } = createTestHarness();
    const adminHeaders = await getAdminHeaders();

    const bookBefore = loansRepository.getBook(QA_IDS.books.bookB);
    const stockBefore = bookBefore?.availableCount ?? 2;

    const res = await app.handle(
      new Request('http://localhost/api/v1/admin/loans/qr/confirm', {
        method: 'POST',
        headers: {
          ...adminHeaders,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ qr_token: QA_PENDING_QR_TOKEN }),
      }),
    );

    expect(res.status).toBe(200);
    const body = (await res.json()) as QrConfirmResponse;
    expect(body.data.loan_id).toBe(QA_IDS.loans.pending);
    expect(body.data.status).toBe('BORROWED');
    expect(body.data.status_label).toBe('Sedang Dipinjam');
    expect(typeof body.data.due_date).toBe('string');
    expect(body.message).toBe('Buku berhasil Dipinjam');

    const bookAfter = loansRepository.getBook(QA_IDS.books.bookB);
    expect(bookAfter?.availableCount).toBe(stockBefore - 1);

    const updatedLoan = loansRepository
      .getLoans()
      .find((l) => l.id === QA_IDS.loans.pending);
    expect(updatedLoan?.status).toBe('BORROWED');
    expect(updatedLoan?.qrTokenHash).toBeNull();
    expect(updatedLoan?.manualCodeHash).toBeNull();
    expect(updatedLoan?.qrConsumedAt).toBeInstanceOf(Date);
    expect(updatedLoan?.confirmedAt).toBeInstanceOf(Date);

    const events = loansRepository.getLoanEvents(QA_IDS.loans.pending);
    expect(events.length).toBeGreaterThan(0);
    const confirmEvent = events.find(
      (e) => e.fromStatus === 'PENDING' && e.toStatus === 'BORROWED',
    );
    expect(confirmEvent).toBeDefined();
    expect(confirmEvent?.actorId).toBe(QA_IDS.users.admin);
  });

  it('enforces single-use token: repeated confirm returns 422 AC-08.06', async () => {
    const { app, getAdminHeaders } = createTestHarness();
    const adminHeaders = await getAdminHeaders();

    const res1 = await app.handle(
      new Request('http://localhost/api/v1/admin/loans/qr/confirm', {
        method: 'POST',
        headers: {
          ...adminHeaders,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ qr_token: QA_PENDING_QR_TOKEN }),
      }),
    );
    expect(res1.status).toBe(200);

    const res2 = await app.handle(
      new Request('http://localhost/api/v1/admin/loans/qr/confirm', {
        method: 'POST',
        headers: {
          ...adminHeaders,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ qr_token: QA_PENDING_QR_TOKEN }),
      }),
    );
    expect(res2.status).toBe(422);
    const body2 = (await res2.json()) as ApiErrorEnvelope;
    expect(body2.code).toBe('invalid_token');
    expect(body2.message).toBe('QR Code tidak valid');

    const resPreview = await app.handle(
      new Request('http://localhost/api/v1/admin/loans/qr/preview', {
        method: 'POST',
        headers: {
          ...adminHeaders,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ qr_token: QA_PENDING_QR_TOKEN }),
      }),
    );
    expect(resPreview.status).toBe(422);

    const resManualAfterQrConfirm = await app.handle(
      new Request('http://localhost/api/v1/admin/loans/qr/confirm', {
        method: 'POST',
        headers: {
          ...adminHeaders,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ qr_token: QA_PENDING_MANUAL_CODE }),
      }),
    );
    expect(resManualAfterQrConfirm.status).toBe(422);
  });

  it('supports preview and single-use confirm via manual confirmation code (case-insensitive)', async () => {
    const { app, loansRepository, getAdminHeaders } = createTestHarness();
    const adminHeaders = await getAdminHeaders();

    const previewRes = await app.handle(
      new Request('http://localhost/api/v1/admin/loans/qr/preview', {
        method: 'POST',
        headers: {
          ...adminHeaders,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          qr_token: ` ${QA_PENDING_MANUAL_CODE.toLowerCase()} `,
        }),
      }),
    );
    expect(previewRes.status).toBe(200);
    const previewBody = (await previewRes.json()) as QrPreviewResponse;
    expect(previewBody.data.loan_id).toBe(QA_IDS.loans.pending);
    expect(previewBody.data.loan_no).toBe('PJM-20261109-0001');

    const confirmRes = await app.handle(
      new Request('http://localhost/api/v1/admin/loans/qr/confirm', {
        method: 'POST',
        headers: {
          ...adminHeaders,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ qr_token: QA_PENDING_MANUAL_CODE }),
      }),
    );
    expect(confirmRes.status).toBe(200);
    const confirmBody = (await confirmRes.json()) as QrConfirmResponse;
    expect(confirmBody.data.status).toBe('BORROWED');

    const updatedLoan = loansRepository
      .getLoans()
      .find((l) => l.id === QA_IDS.loans.pending);
    expect(updatedLoan?.qrTokenHash).toBeNull();
    expect(updatedLoan?.manualCodeHash).toBeNull();
    expect(updatedLoan?.qrConsumedAt).toBeInstanceOf(Date);

    // Cross-channel invalidation: QR token and manual code are both invalid after confirm
    const qrAfterManualRes = await app.handle(
      new Request('http://localhost/api/v1/admin/loans/qr/preview', {
        method: 'POST',
        headers: {
          ...adminHeaders,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ qr_token: QA_PENDING_QR_TOKEN }),
      }),
    );
    expect(qrAfterManualRes.status).toBe(422);
  });

  it('returns 409 conflict when book stock is exhausted (Q-15)', async () => {
    const { app, loansRepository, getAdminHeaders } = createTestHarness();
    const adminHeaders = await getAdminHeaders();

    loansRepository.setBookAvailableCount(QA_IDS.books.bookB, 0);

    const res = await app.handle(
      new Request('http://localhost/api/v1/admin/loans/qr/confirm', {
        method: 'POST',
        headers: {
          ...adminHeaders,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ qr_token: QA_PENDING_QR_TOKEN }),
      }),
    );

    expect(res.status).toBe(409);
    const body = (await res.json()) as ApiErrorEnvelope;
    expect(body.code).toBe('conflict');
    expect(body.message).toBe('Buku tidak tersedia (stok habis)');

    const loan = loansRepository
      .getLoans()
      .find((l) => l.id === QA_IDS.loans.pending);
    expect(loan?.status).toBe('PENDING');
    expect(loan?.qrConsumedAt).toBeNull();
  });

  it('rejects unknown or invalid QR token on confirm with 422 AC-08.06', async () => {
    const { app, getAdminHeaders } = createTestHarness();
    const adminHeaders = await getAdminHeaders();

    const res = await app.handle(
      new Request('http://localhost/api/v1/admin/loans/qr/confirm', {
        method: 'POST',
        headers: {
          ...adminHeaders,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ qr_token: 'fake-unknown-token' }),
      }),
    );

    expect(res.status).toBe(422);
    const body = (await res.json()) as ApiErrorEnvelope;
    expect(body.code).toBe('invalid_token');
    expect(body.message).toBe('QR Code tidak valid');
  });

  it('rejects empty or missing token on confirm with 422 AC-08.06', async () => {
    const { app, getAdminHeaders } = createTestHarness();
    const adminHeaders = await getAdminHeaders();

    const res = await app.handle(
      new Request('http://localhost/api/v1/admin/loans/qr/confirm', {
        method: 'POST',
        headers: {
          ...adminHeaders,
          'content-type': 'application/json',
        },
        body: JSON.stringify({ qr_token: '' }),
      }),
    );

    expect(res.status).toBe(422);
    const body = (await res.json()) as ApiErrorEnvelope;
    expect(body.code).toBe('invalid_token');
  });
});

describe('Loans API - BE-S2-02: Ajukan pinjam + token QR', () => {
  describe('POST /loans (ajukan peminjaman, Member - AC-08.01, AC-08.04)', () => {
    it('successfully creates a loan with status PENDING and returns 201 (AC-08.01)', async () => {
      const { app, getMemberHeaders, loansRepository } = createTestHarness();
      const headers = await getMemberHeaders();

      const initialBook = await loansRepository.findBookById(
        QA_IDS.books.bookB,
      );
      expect(initialBook?.availableCount).toBe(2);

      const res = await app.handle(
        new Request('http://localhost/api/v1/loans', {
          method: 'POST',
          headers: {
            ...headers,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            book_id: QA_IDS.books.bookB,
          }),
        }),
      );

      expect(res.status).toBe(201);
      const json = (await res.json()) as {
        data: {
          id: string;
          loan_no: string;
          status: string;
          status_label: string;
        };
        message: string;
      };

      expect(json.message).toBe('Pengajuan peminjaman berhasil');
      expect(json.data.status).toBe('PENDING');
      expect(json.data.status_label).toBe('Pending Peminjaman');
      expect(json.data.loan_no).toMatch(/^PJM-20261109-\d{4}$/);

      // Verify book stock is not yet decremented (it decrements on admin confirmation per AC-08.03)
      const afterBook = await loansRepository.findBookById(QA_IDS.books.bookB);
      expect(afterBook?.availableCount).toBe(2);

      // Verify loan record in repository has qrTokenHash populated
      const loan = await loansRepository.findLoanRecordById(json.data.id);
      expect(loan).not.toBeNull();
      expect(loan?.status).toBe('PENDING');
      expect(loan?.qrTokenHash).toBeDefined();
      expect(loan?.qrTokenHash?.length).toBe(64); // SHA-256 hex
    });

    it('rejects with 409 conflict when book is out of stock (AC-08.04)', async () => {
      const { app, getMemberHeaders } = createTestHarness();
      const headers = await getMemberHeaders();

      const res = await app.handle(
        new Request('http://localhost/api/v1/loans', {
          method: 'POST',
          headers: {
            ...headers,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            book_id: QA_IDS.books.bookEmpty, // stock is 0
          }),
        }),
      );

      expect(res.status).toBe(409);
      const json = (await res.json()) as { code: string; message: string };
      expect(json.code).toBe('conflict');
      expect(json.message).toBe('Buku tidak tersedia (stok habis)');
    });

    it('returns 404 when book does not exist or is soft-deleted', async () => {
      const { app, getMemberHeaders } = createTestHarness();
      const headers = await getMemberHeaders();

      const res = await app.handle(
        new Request('http://localhost/api/v1/loans', {
          method: 'POST',
          headers: {
            ...headers,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            book_id: '00000000-0000-4000-8002-999999999999',
          }),
        }),
      );

      expect(res.status).toBe(404);
      const json = (await res.json()) as { code: string; message: string };
      expect(json.code).toBe('not_found');
      expect(json.message).toBe('Buku tidak ditemukan.');
    });

    it('returns 422 when book_id is invalid UUID format', async () => {
      const { app, getMemberHeaders } = createTestHarness();
      const headers = await getMemberHeaders();

      const res = await app.handle(
        new Request('http://localhost/api/v1/loans', {
          method: 'POST',
          headers: {
            ...headers,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            book_id: 'invalid-uuid-string',
          }),
        }),
      );

      expect(res.status).toBe(422);
    });

    it('enforces authentication and member role on POST /loans (SEC-02, SEC-05)', async () => {
      const { app, getAdminHeaders } = createTestHarness();

      // Unauthenticated -> 401
      const unauthRes = await app.handle(
        new Request('http://localhost/api/v1/loans', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ book_id: QA_IDS.books.bookA }),
        }),
      );
      expect(unauthRes.status).toBe(401);

      // Admin role (not member) -> 403
      const adminHeaders = await getAdminHeaders();
      const adminRes = await app.handle(
        new Request('http://localhost/api/v1/loans', {
          method: 'POST',
          headers: {
            ...adminHeaders,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ book_id: QA_IDS.books.bookA }),
        }),
      );
      expect(adminRes.status).toBe(403);
    });

    it('generates sequential loan_no on the same day and restarts sequence on new day (Q-36)', async () => {
      const { app, getMemberHeaders, clock } = createTestHarness();
      const headers = await getMemberHeaders();

      // First loan on 2026-11-09 (seed already has 0001-0011)
      const res1 = await app.handle(
        new Request('http://localhost/api/v1/loans', {
          method: 'POST',
          headers: { ...headers, 'content-type': 'application/json' },
          body: JSON.stringify({ book_id: QA_IDS.books.bookA }),
        }),
      );
      expect(res1.status).toBe(201);
      const json1 = (await res1.json()) as { data: { loan_no: string } };
      expect(json1.data.loan_no).toBe('PJM-20261109-0012');

      const res2 = await app.handle(
        new Request('http://localhost/api/v1/loans', {
          method: 'POST',
          headers: { ...headers, 'content-type': 'application/json' },
          body: JSON.stringify({ book_id: QA_IDS.books.bookA }),
        }),
      );
      expect(res2.status).toBe(201);
      const json2 = (await res2.json()) as { data: { loan_no: string } };
      expect(json2.data.loan_no).toBe('PJM-20261109-0013');

      // Advance clock to next day: 2026-11-10
      clock.advanceDays(1);

      const res3 = await app.handle(
        new Request('http://localhost/api/v1/loans', {
          method: 'POST',
          headers: { ...headers, 'content-type': 'application/json' },
          body: JSON.stringify({ book_id: QA_IDS.books.bookA }),
        }),
      );
      expect(res3.status).toBe(201);
      const json3 = (await res3.json()) as { data: { loan_no: string } };
      expect(json3.data.loan_no).toBe('PJM-20261110-0001');
    });
  });

  describe('GET /loans/me (daftar pinjaman member - AC-08.05)', () => {
    it('returns member loans list with pagination and correctly mapped actions (AC-08.05)', async () => {
      const { app, getMemberHeaders } = createTestHarness();
      const headers = await getMemberHeaders();

      const res = await app.handle(
        new Request('http://localhost/api/v1/loans/me?page=1&limit=20', {
          method: 'GET',
          headers,
        }),
      );

      expect(res.status).toBe(200);
      const json = (await res.json()) as {
        data: Array<{
          id: string;
          loan_no: string;
          book_id: string;
          book_title: string;
          book_author: string;
          book_cover_url: string | null;
          requested_at: string;
          due_date: string | null;
          status: string;
          status_label: string;
          member_action: string;
        }>;
        pagination: {
          page: number;
          limit: number;
          total: number;
          totalPages: number;
        };
      };

      expect(json.data.length).toBeGreaterThanOrEqual(1);
      expect(json.pagination.page).toBe(1);
      expect(json.pagination.limit).toBe(20);

      const pendingLoan = json.data.find((l) => l.status === 'PENDING');
      expect(pendingLoan).toBeDefined();
      expect(pendingLoan?.status_label).toBe('Pending Peminjaman');
      expect(pendingLoan?.member_action).toBe('QR');
      expect(pendingLoan?.book_title).toBe('Book-B: Clean Architecture');
      expect(pendingLoan?.book_cover_url).toBe('/api/v1/covers/clean-arch.jpg');

      // Verify other member action mappings per AC-08.05
      const borrowedLoan = json.data.find((l) => l.status === 'BORROWED');
      expect(borrowedLoan?.member_action).toBe('Kembalikan');

      const returnPendingLoan = json.data.find(
        (l) => l.status === 'RETURN_PENDING',
      );
      expect(returnPendingLoan?.member_action).toBe('Menunggu admin');

      const returnedLoan = json.data.find((l) => l.status === 'RETURNED');
      expect(returnedLoan?.member_action).toBe('Selesai');
    });

    it('enforces data isolation between members (SEC-05)', async () => {
      const { app, getMemberHeaders, getMember2Headers } = createTestHarness();
      const member1Headers = await getMemberHeaders();
      const member2Headers = await getMember2Headers();

      // Member 1 creates a loan
      const createRes = await app.handle(
        new Request('http://localhost/api/v1/loans', {
          method: 'POST',
          headers: {
            ...member1Headers,
            'content-type': 'application/json',
          },
          body: JSON.stringify({ book_id: QA_IDS.books.bookA }),
        }),
      );
      expect(createRes.status).toBe(201);
      const createJson = (await createRes.json()) as { data: { id: string } };
      const createdLoanId = createJson.data.id;

      // Member 2 checks their loans list
      const resMember2 = await app.handle(
        new Request('http://localhost/api/v1/loans/me', {
          method: 'GET',
          headers: member2Headers,
        }),
      );
      expect(resMember2.status).toBe(200);
      const jsonMember2 = (await resMember2.json()) as {
        data: Array<{ id: string }>;
      };
      const foundInMember2 = jsonMember2.data.some(
        (l) => l.id === createdLoanId,
      );
      expect(foundInMember2).toBe(false);

      // Member 1 checks their loans list and finds it
      const resMember1 = await app.handle(
        new Request('http://localhost/api/v1/loans/me', {
          method: 'GET',
          headers: member1Headers,
        }),
      );
      expect(resMember1.status).toBe(200);
      const jsonMember1 = (await resMember1.json()) as {
        data: Array<{ id: string }>;
      };
      const foundInMember1 = jsonMember1.data.some(
        (l) => l.id === createdLoanId,
      );
      expect(foundInMember1).toBe(true);
    });

    it('enforces authentication on GET /loans/me (SEC-02)', async () => {
      const { app, getAdminHeaders } = createTestHarness();

      const unauthRes = await app.handle(
        new Request('http://localhost/api/v1/loans/me'),
      );
      expect(unauthRes.status).toBe(401);

      const adminHeaders = await getAdminHeaders();
      const adminRes = await app.handle(
        new Request('http://localhost/api/v1/loans/me', {
          headers: adminHeaders,
        }),
      );
      expect(adminRes.status).toBe(403);
    });
  });

  describe('GET /loans/:id/qr (ambil/rotasi token QR - AC-08.02)', () => {
    it('returns QR token for pending loan and updates hash in database (AC-08.02)', async () => {
      const { app, getMemberHeaders, loansRepository } = createTestHarness();
      const headers = await getMemberHeaders();

      const res = await app.handle(
        new Request(
          `http://localhost/api/v1/loans/${QA_IDS.loans.pending}/qr`,
          {
            method: 'GET',
            headers,
          },
        ),
      );

      expect(res.status).toBe(200);
      const json = (await res.json()) as {
        data: {
          loan_id: string;
          loan_no: string;
          qr_token: string;
          manual_code: string;
        };
      };

      expect(json.data.loan_id).toBe(QA_IDS.loans.pending);
      expect(json.data.loan_no).toBe('PJM-20261109-0001');
      expect(json.data.qr_token).toBeDefined();
      expect(json.data.qr_token.length).toBeGreaterThanOrEqual(16);
      expect(json.data.manual_code).toMatch(MANUAL_CODE_REGEX);

      // Verify that database hashes now match sha256(qr_token) and sha256(manual_code)
      const loan = await loansRepository.findLoanRecordById(
        QA_IDS.loans.pending,
      );
      expect(loan?.qrTokenHash).toBe(sha256Hex(json.data.qr_token));
      expect(loan?.manualCodeHash).toBe(sha256Hex(json.data.manual_code));
    });

    it('rotates token upon subsequent calls to GET /loans/:id/qr', async () => {
      const { app, getMemberHeaders, loansRepository } = createTestHarness();
      const headers = await getMemberHeaders();

      // First call
      const res1 = await app.handle(
        new Request(
          `http://localhost/api/v1/loans/${QA_IDS.loans.pending}/qr`,
          {
            method: 'GET',
            headers,
          },
        ),
      );
      expect(res1.status).toBe(200);
      const json1 = (await res1.json()) as {
        data: { qr_token: string; manual_code: string };
      };

      // Second call (rotates token)
      const res2 = await app.handle(
        new Request(
          `http://localhost/api/v1/loans/${QA_IDS.loans.pending}/qr`,
          {
            method: 'GET',
            headers,
          },
        ),
      );
      expect(res2.status).toBe(200);
      const json2 = (await res2.json()) as {
        data: { qr_token: string; manual_code: string };
      };

      expect(json1.data.qr_token).not.toBe(json2.data.qr_token);
      expect(json1.data.manual_code).not.toBe(json2.data.manual_code);

      // Verify database has latest token hashes
      const loan = await loansRepository.findLoanRecordById(
        QA_IDS.loans.pending,
      );
      expect(loan?.qrTokenHash).toBe(sha256Hex(json2.data.qr_token));
      expect(loan?.manualCodeHash).toBe(sha256Hex(json2.data.manual_code));
    });

    it('returns 403 when requesting QR for a loan belonging to another member (SEC-05)', async () => {
      const { app, getMember2Headers } = createTestHarness();
      const member2Headers = await getMember2Headers();

      // QA_IDS.loans.pending belongs to member1
      const res = await app.handle(
        new Request(
          `http://localhost/api/v1/loans/${QA_IDS.loans.pending}/qr`,
          {
            method: 'GET',
            headers: member2Headers,
          },
        ),
      );

      expect(res.status).toBe(403);
      const json = (await res.json()) as { code: string };
      expect(json.code).toBe('forbidden');
    });

    it('returns 404 when loan does not exist', async () => {
      const { app, getMemberHeaders } = createTestHarness();
      const headers = await getMemberHeaders();

      const res = await app.handle(
        new Request(
          'http://localhost/api/v1/loans/00000000-0000-4000-8003-999999999999/qr',
          {
            method: 'GET',
            headers,
          },
        ),
      );

      expect(res.status).toBe(404);
      const json = (await res.json()) as { code: string; message: string };
      expect(json.code).toBe('not_found');
      expect(json.message).toBe('Peminjaman tidak ditemukan.');
    });

    it('returns 422 invalid_state_transition when loan is not in PENDING status', async () => {
      const { app, getMemberHeaders, loansRepository } = createTestHarness();
      const headers = await getMemberHeaders();

      // Add a BORROWED loan belonging to member1
      const borrowedLoanId = '00000000-0000-4000-8003-000000000099';
      loansRepository.addLoan({
        id: borrowedLoanId,
        loanNo: 'PJM-20261109-0099',
        userId: QA_IDS.users.member1,
        bookId: QA_IDS.books.bookA,
        status: 'BORROWED',
        requestedAt: new Date(),
        confirmedAt: new Date(),
        dueDate: '2026-11-16',
        returnRequestedAt: null,
        returnedAt: null,
        lateDays: 0,
        fineAmount: null,
        fineStatus: 'Belum Bayar',
        qrTokenHash: null,
        qrConsumedAt: new Date(),
      });

      const res = await app.handle(
        new Request(`http://localhost/api/v1/loans/${borrowedLoanId}/qr`, {
          method: 'GET',
          headers,
        }),
      );

      expect(res.status).toBe(422);
      const json = (await res.json()) as { code: string; message: string };
      expect(json.code).toBe('invalid_state_transition');
      expect(json.message).toBe(
        'Peminjaman bukan berstatus Pending Peminjaman',
      );
    });

    it('returns 404 when id in URL is not a valid UUID', async () => {
      const { app, getMemberHeaders } = createTestHarness();
      const headers = await getMemberHeaders();

      const res = await app.handle(
        new Request('http://localhost/api/v1/loans/not-a-valid-uuid/qr', {
          method: 'GET',
          headers,
        }),
      );

      expect(res.status).toBe(404);
    });
  });

  describe('BE-S3-03: POST /loans/:id/return (ajukan pengembalian + rating, Member)', () => {
    it('returns 401 when unauthenticated', async () => {
      const { app } = createTestHarness();

      const res = await app.handle(
        new Request(
          `http://localhost/api/v1/loans/${QA_IDS.loans.borrow0}/return`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ score: 5 }),
          },
        ),
      );

      expect(res.status).toBe(401);
    });

    it('returns 403 when called by admin', async () => {
      const { app, getAdminHeaders } = createTestHarness();
      const headers = await getAdminHeaders();

      const res = await app.handle(
        new Request(
          `http://localhost/api/v1/loans/${QA_IDS.loans.borrow0}/return`,
          {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ score: 5 }),
          },
        ),
      );

      expect(res.status).toBe(403);
    });

    it('returns 404 when loan id is not a valid UUID', async () => {
      const { app, getMemberHeaders } = createTestHarness();
      const headers = await getMemberHeaders();

      const res = await app.handle(
        new Request('http://localhost/api/v1/loans/invalid-uuid/return', {
          method: 'POST',
          headers: { ...headers, 'Content-Type': 'application/json' },
          body: JSON.stringify({ score: 5 }),
        }),
      );

      expect(res.status).toBe(404);
    });

    it('returns 404 when loan does not exist', async () => {
      const { app, getMemberHeaders } = createTestHarness();
      const headers = await getMemberHeaders();

      const res = await app.handle(
        new Request(
          'http://localhost/api/v1/loans/00000000-0000-4000-8099-000000000999/return',
          {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ score: 5 }),
          },
        ),
      );

      expect(res.status).toBe(404);
    });

    it('returns 403 when attempting to return another member loan (SEC-05)', async () => {
      const { app, getMember2Headers } = createTestHarness();
      const headers = await getMember2Headers();

      const res = await app.handle(
        new Request(
          `http://localhost/api/v1/loans/${QA_IDS.loans.borrow0}/return`,
          {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ score: 5 }),
          },
        ),
      );

      expect(res.status).toBe(403);
      const json = (await res.json()) as ApiErrorEnvelope;
      expect(json.code).toBe('forbidden');
      expect(json.message).toBe('Akses ditolak.');
    });

    it('enforces rating mandatory with verbatim AC-09.06 message on invalid scores', async () => {
      const { app, getMemberHeaders } = createTestHarness();
      const headers = await getMemberHeaders();

      const invalidPayloads = [
        {},
        { score: undefined },
        { score: null },
        { score: 0 },
        { score: 6 },
        { score: 3.5 },
        { score: '5' },
        { score: -1 },
      ];

      for (const payload of invalidPayloads) {
        const res = await app.handle(
          new Request(
            `http://localhost/api/v1/loans/${QA_IDS.loans.borrow0}/return`,
            {
              method: 'POST',
              headers: { ...headers, 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            },
          ),
        );

        expect(res.status).toBe(422);
        const json = (await res.json()) as ApiErrorEnvelope;
        expect(json.code).toBe('invalid_request');
        expect(json.message).toBe(RATING_REQUIRED_MESSAGE);
      }
    });

    it('successfully returns on-time loan (BORROWED -> RETURN_PENDING, AC-09.01)', async () => {
      const { app, getMemberHeaders, loansRepository } = createTestHarness();
      const headers = await getMemberHeaders();

      const res = await app.handle(
        new Request(
          `http://localhost/api/v1/loans/${QA_IDS.loans.borrow0}/return`,
          {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ score: 5 }),
          },
        ),
      );

      expect(res.status).toBe(200);
      const json = (await res.json()) as ReturnLoanResponse;
      expect(json.message).toBe(RETURN_SUCCESS_MESSAGE);
      expect(json.data.loan_id).toBe(QA_IDS.loans.borrow0);
      expect(json.data.status).toBe('RETURN_PENDING');
      expect(json.data.status_label).toBe('Pending Pengembalian');

      const loanRecord = await loansRepository.findLoanRecordById(
        QA_IDS.loans.borrow0,
      );
      expect(loanRecord?.status).toBe('RETURN_PENDING');
      expect(loanRecord?.returnRequestedAt).not.toBeNull();
      expect(loanRecord?.lateDays).toBe(0);
      expect(loanRecord?.fineAmount).toBe(0);

      const ratings = loansRepository.getRatings(QA_IDS.loans.borrow0);
      expect(ratings.length).toBe(1);
      expect(ratings[0]?.score).toBe(5);
      expect(ratings[0]?.userId).toBe(QA_IDS.users.member1);

      const events = loansRepository.getLoanEvents(QA_IDS.loans.borrow0);
      const returnEvent = events.find((e) => e.toStatus === 'RETURN_PENDING');
      expect(returnEvent).toBeDefined();
      expect(returnEvent?.fromStatus).toBe('BORROWED');
      expect(returnEvent?.actorId).toBe(QA_IDS.users.member1);
    });

    it('successfully returns overdue loan 1-4 days (OVERDUE -> FINE_PENDING, AC-09.02)', async () => {
      const { app, getMemberHeaders, loansRepository } = createTestHarness();
      const headers = await getMemberHeaders();

      const res = await app.handle(
        new Request(
          `http://localhost/api/v1/loans/${QA_IDS.loans.over1}/return`,
          {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ score: 4 }),
          },
        ),
      );

      expect(res.status).toBe(200);
      const json = (await res.json()) as ReturnLoanResponse;
      expect(json.message).toBe(RETURN_SUCCESS_MESSAGE);
      expect(json.data.loan_id).toBe(QA_IDS.loans.over1);
      expect(json.data.status).toBe('FINE_PENDING');
      expect(json.data.status_label).toBe('Pending Keterlambatan');

      const loanRecord = await loansRepository.findLoanRecordById(
        QA_IDS.loans.over1,
      );
      expect(loanRecord?.status).toBe('FINE_PENDING');
      expect(loanRecord?.returnRequestedAt).not.toBeNull();
      expect(loanRecord?.lateDays).toBe(1);
      expect(loanRecord?.fineAmount).toBe(2000);
      expect(loanRecord?.fineStatus).toBe('Belum Bayar');

      const ratings = loansRepository.getRatings(QA_IDS.loans.over1);
      expect(ratings.length).toBe(1);
      expect(ratings[0]?.score).toBe(4);

      const events = loansRepository.getLoanEvents(QA_IDS.loans.over1);
      const returnEvent = events.find((e) => e.toStatus === 'FINE_PENDING');
      expect(returnEvent).toBeDefined();
      expect(returnEvent?.fromStatus).toBe('OVERDUE');
    });

    it('successfully returns overdue loan >= 5 days (OVERDUE -> FINE_PENDING, AC-09.02)', async () => {
      const { app, getMemberHeaders, loansRepository } = createTestHarness();
      const headers = await getMemberHeaders();

      const res = await app.handle(
        new Request(
          `http://localhost/api/v1/loans/${QA_IDS.loans.over5}/return`,
          {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ score: 5 }),
          },
        ),
      );

      expect(res.status).toBe(200);
      const json = (await res.json()) as ReturnLoanResponse;
      expect(json.message).toBe(RETURN_SUCCESS_MESSAGE);
      expect(json.data.loan_id).toBe(QA_IDS.loans.over5);
      expect(json.data.status).toBe('FINE_PENDING');
      expect(json.data.status_label).toBe('Pending Keterlambatan');

      const loanRecord = await loansRepository.findLoanRecordById(
        QA_IDS.loans.over5,
      );
      expect(loanRecord?.status).toBe('FINE_PENDING');
      expect(loanRecord?.returnRequestedAt).not.toBeNull();
      expect(loanRecord?.lateDays).toBe(5);
      expect(loanRecord?.fineAmount).toBeNull();
      expect(loanRecord?.fineStatus).toBe('Belum Bayar');
    });

    it('rejects return with 422 when status is not BORROWED or OVERDUE', async () => {
      const { app, getMemberHeaders } = createTestHarness();
      const headers = await getMemberHeaders();

      const invalidLoans = [
        QA_IDS.loans.pending,
        QA_IDS.loans.retPend,
        QA_IDS.loans.finePend,
        QA_IDS.loans.returnedOn,
      ];

      for (const loanId of invalidLoans) {
        const res = await app.handle(
          new Request(`http://localhost/api/v1/loans/${loanId}/return`, {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ score: 5 }),
          }),
        );

        expect(res.status).toBe(422);
        const json = (await res.json()) as ApiErrorEnvelope;
        expect(json.code).toBe('invalid_state_transition');
      }
    });
  });

  describe('BE-S3-04: POST /admin/loans/:id/fine-payment (pembayaran denda)', () => {
    it('returns 401 when unauthenticated', async () => {
      const { app } = createTestHarness();

      const res = await app.handle(
        new Request(
          `http://localhost/api/v1/admin/loans/${QA_IDS.loans.finePend}/fine-payment`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: 10000 }),
          },
        ),
      );

      expect(res.status).toBe(401);
    });

    it('returns 403 when called by member', async () => {
      const { app, getMemberHeaders } = createTestHarness();
      const headers = await getMemberHeaders();

      const res = await app.handle(
        new Request(
          `http://localhost/api/v1/admin/loans/${QA_IDS.loans.finePend}/fine-payment`,
          {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: 10000 }),
          },
        ),
      );

      expect(res.status).toBe(403);
    });

    it('returns 404 when loan id is not a valid UUID', async () => {
      const { app, getAdminHeaders } = createTestHarness();
      const headers = await getAdminHeaders();

      const res = await app.handle(
        new Request(
          'http://localhost/api/v1/admin/loans/invalid-uuid/fine-payment',
          {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: 10000 }),
          },
        ),
      );

      expect(res.status).toBe(404);
    });

    it('returns 404 when loan does not exist', async () => {
      const { app, getAdminHeaders } = createTestHarness();
      const headers = await getAdminHeaders();

      const res = await app.handle(
        new Request(
          'http://localhost/api/v1/admin/loans/00000000-0000-4000-8099-000000000999/fine-payment',
          {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: 10000 }),
          },
        ),
      );

      expect(res.status).toBe(404);
    });

    it('rejects with 422 when status is not FINE_PENDING', async () => {
      const { app, getAdminHeaders } = createTestHarness();
      const headers = await getAdminHeaders();

      const invalidLoans = [
        QA_IDS.loans.pending,
        QA_IDS.loans.borrow0,
        QA_IDS.loans.over1,
        QA_IDS.loans.retPend,
        QA_IDS.loans.returnedOn,
      ];

      for (const loanId of invalidLoans) {
        const res = await app.handle(
          new Request(
            `http://localhost/api/v1/admin/loans/${loanId}/fine-payment`,
            {
              method: 'POST',
              headers: { ...headers, 'Content-Type': 'application/json' },
              body: JSON.stringify({ amount: 10000 }),
            },
          ),
        );

        expect(res.status).toBe(422);
        const json = (await res.json()) as ApiErrorEnvelope;
        expect(json.code).toBe('invalid_state_transition');
      }
    });

    it('rejects with 422 when fine_status is already Sudah Bayar', async () => {
      const { app, getAdminHeaders } = createTestHarness();
      const headers = await getAdminHeaders();

      const res = await app.handle(
        new Request(
          `http://localhost/api/v1/admin/loans/${QA_IDS.loans.finePaid}/fine-payment`,
          {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: 15000 }),
          },
        ),
      );

      expect(res.status).toBe(422);
      const json = (await res.json()) as ApiErrorEnvelope;
      expect(json.code).toBe('invalid_state_transition');
    });

    it('successfully processes automatic fine for 1-4 days (AC-09.04)', async () => {
      const { app, getAdminHeaders, loansRepository } = createTestHarness(
        (repo) => {
          // Add a FINE_PENDING loan with lateDays = 2, Belum Bayar
          const loan: InMemoryLoan = {
            id: '00000000-0000-4000-8003-000000000099',
            loanNo: 'PJM-20261109-0099',
            userId: QA_IDS.users.member1,
            bookId: QA_IDS.books.bookC,
            status: 'FINE_PENDING',
            requestedAt: new Date(),
            confirmedAt: new Date(),
            dueDate: '2026-11-07',
            returnRequestedAt: new Date(),
            returnedAt: null,
            lateDays: 2,
            fineAmount: 2000,
            fineStatus: 'Belum Bayar',
          };
          repo.addLoan(loan);
        },
      );
      const headers = await getAdminHeaders();

      const res = await app.handle(
        new Request(
          'http://localhost/api/v1/admin/loans/00000000-0000-4000-8003-000000000099/fine-payment',
          {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
          },
        ),
      );

      expect(res.status).toBe(200);
      const json = (await res.json()) as FinePaymentResponse;
      expect(json.message).toBe(FINE_PAYMENT_SUCCESS_MESSAGE);
      expect(json.data.fine_amount).toBe(2000);
      expect(json.data.fine_status).toBe('Sudah Bayar');

      const loanRecord = await loansRepository.findLoanRecordById(
        '00000000-0000-4000-8003-000000000099',
      );
      expect(loanRecord?.fineAmount).toBe(2000);
      expect(loanRecord?.fineStatus).toBe('Sudah Bayar');

      const events = loansRepository.getLoanEvents(
        '00000000-0000-4000-8003-000000000099',
      );
      const payEvent = events.find(
        (e) => e.fromStatus === 'FINE_PENDING' && e.toStatus === 'FINE_PENDING',
      );
      expect(payEvent).toBeDefined();
    });

    it('enforces validation for >= 5 days with verbatim AC-09.09 message', async () => {
      const { app, getAdminHeaders } = createTestHarness();
      const headers = await getAdminHeaders();

      const invalidPayloads = [
        {},
        { amount: undefined },
        { amount: null },
        { amount: 0 },
        { amount: -500 },
        { amount: '5000' },
        { amount: 100_000_000 },
        { amount: 12.5 },
      ];

      for (const payload of invalidPayloads) {
        const res = await app.handle(
          new Request(
            `http://localhost/api/v1/admin/loans/${QA_IDS.loans.finePend}/fine-payment`,
            {
              method: 'POST',
              headers: { ...headers, 'Content-Type': 'application/json' },
              body: JSON.stringify(payload),
            },
          ),
        );

        expect(res.status).toBe(422);
        const json = (await res.json()) as ApiErrorEnvelope;
        expect(json.message).toBe(FINE_REQUIRED_MESSAGE);
      }
    });

    it('successfully processes manual fine for >= 5 days (AC-09.08)', async () => {
      const { app, getAdminHeaders, loansRepository } = createTestHarness();
      const headers = await getAdminHeaders();

      const res = await app.handle(
        new Request(
          `http://localhost/api/v1/admin/loans/${QA_IDS.loans.finePend}/fine-payment`,
          {
            method: 'POST',
            headers: { ...headers, 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: 25000 }),
          },
        ),
      );

      expect(res.status).toBe(200);
      const json = (await res.json()) as FinePaymentResponse;
      expect(json.message).toBe(FINE_PAYMENT_SUCCESS_MESSAGE);
      expect(json.data.fine_amount).toBe(25000);
      expect(json.data.fine_status).toBe('Sudah Bayar');

      const loanRecord = await loansRepository.findLoanRecordById(
        QA_IDS.loans.finePend,
      );
      expect(loanRecord?.fineAmount).toBe(25000);
      expect(loanRecord?.fineStatus).toBe('Sudah Bayar');

      const events = loansRepository.getLoanEvents(QA_IDS.loans.finePend);
      const payEvent = events.find(
        (e) => e.fromStatus === 'FINE_PENDING' && e.toStatus === 'FINE_PENDING',
      );
      expect(payEvent).toBeDefined();
    });
  });

  describe('BE-S3-04: POST /admin/loans/:id/return-confirmation (konfirmasi pengembalian)', () => {
    it('returns 401 when unauthenticated', async () => {
      const { app } = createTestHarness();

      const res = await app.handle(
        new Request(
          `http://localhost/api/v1/admin/loans/${QA_IDS.loans.retPend}/return-confirmation`,
          {
            method: 'POST',
          },
        ),
      );

      expect(res.status).toBe(401);
    });

    it('returns 403 when called by member', async () => {
      const { app, getMemberHeaders } = createTestHarness();
      const headers = await getMemberHeaders();

      const res = await app.handle(
        new Request(
          `http://localhost/api/v1/admin/loans/${QA_IDS.loans.retPend}/return-confirmation`,
          {
            method: 'POST',
            headers,
          },
        ),
      );

      expect(res.status).toBe(403);
    });

    it('returns 404 when loan id is not a valid UUID', async () => {
      const { app, getAdminHeaders } = createTestHarness();
      const headers = await getAdminHeaders();

      const res = await app.handle(
        new Request(
          'http://localhost/api/v1/admin/loans/invalid-uuid/return-confirmation',
          {
            method: 'POST',
            headers,
          },
        ),
      );

      expect(res.status).toBe(404);
    });

    it('returns 404 when loan does not exist', async () => {
      const { app, getAdminHeaders } = createTestHarness();
      const headers = await getAdminHeaders();

      const res = await app.handle(
        new Request(
          'http://localhost/api/v1/admin/loans/00000000-0000-4000-8099-000000000999/return-confirmation',
          {
            method: 'POST',
            headers,
          },
        ),
      );

      expect(res.status).toBe(404);
    });

    it('rejects with 422 when status is not RETURN_PENDING or FINE_PENDING', async () => {
      const { app, getAdminHeaders } = createTestHarness();
      const headers = await getAdminHeaders();

      const invalidLoans = [
        QA_IDS.loans.pending,
        QA_IDS.loans.borrow0,
        QA_IDS.loans.over1,
        QA_IDS.loans.returnedOn,
      ];

      for (const loanId of invalidLoans) {
        const res = await app.handle(
          new Request(
            `http://localhost/api/v1/admin/loans/${loanId}/return-confirmation`,
            {
              method: 'POST',
              headers,
            },
          ),
        );

        expect(res.status).toBe(422);
        const json = (await res.json()) as ApiErrorEnvelope;
        expect(json.code).toBe('invalid_state_transition');
      }
    });

    it('rejects with 403 on FINE_PENDING when fine is not yet paid (Belum Bayar, AC-09.04)', async () => {
      const { app, getAdminHeaders } = createTestHarness();
      const headers = await getAdminHeaders();

      const res = await app.handle(
        new Request(
          `http://localhost/api/v1/admin/loans/${QA_IDS.loans.finePend}/return-confirmation`,
          {
            method: 'POST',
            headers,
          },
        ),
      );

      expect(res.status).toBe(403);
      const json = (await res.json()) as ApiErrorEnvelope;
      expect(json.code).toBe('forbidden');
      expect(json.message).toBe('Denda belum dibayar.');
    });

    it('successfully confirms return on RETURN_PENDING and increments book stock atomically (AC-09.03, Q-09)', async () => {
      const { app, getAdminHeaders, loansRepository } = createTestHarness();
      const headers = await getAdminHeaders();

      const initialBook = loansRepository.getBook(QA_IDS.books.bookG);
      const initialStock = initialBook?.availableCount ?? 0;

      const res = await app.handle(
        new Request(
          `http://localhost/api/v1/admin/loans/${QA_IDS.loans.retPend}/return-confirmation`,
          {
            method: 'POST',
            headers,
          },
        ),
      );

      expect(res.status).toBe(200);
      const json = (await res.json()) as ReturnConfirmResponse;
      expect(json.message).toBe(RETURN_CONFIRM_SUCCESS_MESSAGE);
      expect(json.data.loan_id).toBe(QA_IDS.loans.retPend);
      expect(json.data.status).toBe('RETURNED');
      expect(json.data.status_label).toBe('Sudah Dikembalikan');

      const loanRecord = await loansRepository.findLoanRecordById(
        QA_IDS.loans.retPend,
      );
      expect(loanRecord?.status).toBe('RETURNED');
      expect(loanRecord?.returnedAt).not.toBeNull();

      const updatedBook = loansRepository.getBook(QA_IDS.books.bookG);
      expect(updatedBook?.availableCount).toBe(initialStock + 1);

      const events = loansRepository.getLoanEvents(QA_IDS.loans.retPend);
      const confirmEvent = events.find((e) => e.toStatus === 'RETURNED');
      expect(confirmEvent).toBeDefined();
      expect(confirmEvent?.fromStatus).toBe('RETURN_PENDING');
      expect(confirmEvent?.actorId).toBe(QA_IDS.users.admin);
    });

    it('successfully confirms return on FINE_PENDING with Sudah Bayar and increments stock (AC-09.05, Q-09)', async () => {
      const { app, getAdminHeaders, loansRepository } = createTestHarness();
      const headers = await getAdminHeaders();

      const initialBook = loansRepository.getBook(QA_IDS.books.bookI);
      const initialStock = initialBook?.availableCount ?? 0;

      const res = await app.handle(
        new Request(
          `http://localhost/api/v1/admin/loans/${QA_IDS.loans.finePaid}/return-confirmation`,
          {
            method: 'POST',
            headers,
          },
        ),
      );

      expect(res.status).toBe(200);
      const json = (await res.json()) as ReturnConfirmResponse;
      expect(json.message).toBe(RETURN_CONFIRM_SUCCESS_MESSAGE);
      expect(json.data.loan_id).toBe(QA_IDS.loans.finePaid);
      expect(json.data.status).toBe('RETURNED');
      expect(json.data.status_label).toBe('Sudah Dikembalikan');

      const loanRecord = await loansRepository.findLoanRecordById(
        QA_IDS.loans.finePaid,
      );
      expect(loanRecord?.status).toBe('RETURNED');
      expect(loanRecord?.returnedAt).not.toBeNull();

      const updatedBook = loansRepository.getBook(QA_IDS.books.bookI);
      expect(updatedBook?.availableCount).toBe(initialStock + 1);

      const events = loansRepository.getLoanEvents(QA_IDS.loans.finePaid);
      const confirmEvent = events.find((e) => e.toStatus === 'RETURNED');
      expect(confirmEvent).toBeDefined();
      expect(confirmEvent?.fromStatus).toBe('FINE_PENDING');
      expect(confirmEvent?.actorId).toBe(QA_IDS.users.admin);
    });

    it('rejects double return confirmation with 422 invalid_state_transition', async () => {
      const { app, getAdminHeaders } = createTestHarness();
      const headers = await getAdminHeaders();

      const firstRes = await app.handle(
        new Request(
          `http://localhost/api/v1/admin/loans/${QA_IDS.loans.retPend}/return-confirmation`,
          {
            method: 'POST',
            headers,
          },
        ),
      );
      expect(firstRes.status).toBe(200);

      const secondRes = await app.handle(
        new Request(
          `http://localhost/api/v1/admin/loans/${QA_IDS.loans.retPend}/return-confirmation`,
          {
            method: 'POST',
            headers,
          },
        ),
      );
      expect(secondRes.status).toBe(422);
      const json = (await secondRes.json()) as ApiErrorEnvelope;
      expect(json.code).toBe('invalid_state_transition');
    });
  });
});
