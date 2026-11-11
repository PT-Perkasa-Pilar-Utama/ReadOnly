import { describe, expect, it } from 'bun:test';
import { type Database, QA_IDS } from '@readonly/db';
import type {
  AdminLoanDetailResponse,
  AdminLoansResponse,
  ApiErrorEnvelope,
} from '@readonly/shared';
import { createApp } from '../../app';
import { MemoryStorageAdapter } from '../../ports/storage';
import {
  DrizzleLoansRepository,
  InMemoryLoansRepository,
} from './loans.repository';
import { LoansService } from './loans.service';

interface TestHarness {
  app: ReturnType<typeof createApp>;
  storagePort: MemoryStorageAdapter;
  loansRepository: InMemoryLoansRepository;
  getAdminHeaders: () => Promise<Record<string, string>>;
  getMemberHeaders: () => Promise<Record<string, string>>;
}

function createTestHarness(
  repoCustomizer?: (repo: InMemoryLoansRepository) => void,
): TestHarness {
  const storagePort = new MemoryStorageAdapter();
  const loansRepository = new InMemoryLoansRepository();
  if (repoCustomizer) {
    repoCustomizer(loansRepository);
  }
  const loansService = new LoansService({
    repository: loansRepository,
    storage: storagePort,
  });

  const app = createApp({
    loansRepository,
    loansService,
    storagePort,
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
    storagePort,
    loansRepository,
    getAdminHeaders,
    getMemberHeaders,
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
});
