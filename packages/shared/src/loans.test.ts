import { describe, expect, it } from 'bun:test';
import {
  ADMIN_LOAN_STATUSES,
  adminLoanDetailDataSchema,
  adminLoanItemSchema,
  adminLoansQuerySchema,
  computeFineAmount,
  createLoanInputSchema,
  createLoanResponseDataSchema,
  LOAN_STATUSES,
  loanQrResponseDataSchema,
  MEMBER_ACTIONS,
  myLoanItemSchema,
  myLoansQuerySchema,
  STATUS_MEMBER_ACTION_MAP,
} from './loans';

describe('shared loans schemas & contracts (BE-S2-02 & BE-S3-01)', () => {
  it('validates create loan input schema with valid UUID', () => {
    const valid = createLoanInputSchema.safeParse({
      book_id: 'a0000000-0000-0000-0000-000000000001',
    });
    expect(valid.success).toBe(true);

    const invalid = createLoanInputSchema.safeParse({
      book_id: 'not-a-uuid',
    });
    expect(invalid.success).toBe(false);
  });

  it('validates create loan response data schema', () => {
    const valid = createLoanResponseDataSchema.safeParse({
      id: 'a0000000-0000-0000-0000-000000000001',
      loan_no: 'PJM-20261109-0001',
      status: 'PENDING',
      status_label: 'Pending Peminjaman',
    });
    expect(valid.success).toBe(true);
  });

  it('validates my loans query schema defaults and limits', () => {
    const defaultQuery = myLoansQuerySchema.parse({});
    expect(defaultQuery.page).toBe(1);
    expect(defaultQuery.limit).toBe(10);

    const customQuery = myLoansQuerySchema.parse({
      page: '3',
      limit: '25',
    });
    expect(customQuery.page).toBe(3);
    expect(customQuery.limit).toBe(25);

    const invalidLimit = myLoansQuerySchema.safeParse({ limit: 100 });
    expect(invalidLimit.success).toBe(false);
  });

  it('maps each canonical LoanStatus to the exact MemberAction in AC-08.05', () => {
    expect(STATUS_MEMBER_ACTION_MAP.PENDING).toBe('QR');
    expect(STATUS_MEMBER_ACTION_MAP.BORROWED).toBe('Kembalikan');
    expect(STATUS_MEMBER_ACTION_MAP.OVERDUE).toBe('Kembalikan');
    expect(STATUS_MEMBER_ACTION_MAP.RETURN_PENDING).toBe('Menunggu admin');
    expect(STATUS_MEMBER_ACTION_MAP.FINE_PENDING).toBe('Menunggu admin');
    expect(STATUS_MEMBER_ACTION_MAP.RETURNED).toBe('Selesai');

    for (const status of LOAN_STATUSES) {
      expect(MEMBER_ACTIONS).toContain(STATUS_MEMBER_ACTION_MAP[status]);
    }
  });

  it('validates my loan item schema', () => {
    const valid = myLoanItemSchema.safeParse({
      id: 'a0000000-0000-0000-0000-000000000001',
      loan_no: 'PJM-20261109-0001',
      book_id: 'b0000000-0000-0000-0000-000000000001',
      book_title: 'Clean Architecture',
      book_author: 'Robert C. Martin',
      book_cover_url: '/api/v1/covers/clean.jpg',
      requested_at: '2026-11-09T03:00:00.000Z',
      due_date: '2026-11-16',
      status: 'PENDING',
      status_label: 'Pending Peminjaman',
      member_action: 'QR',
    });
    expect(valid.success).toBe(true);
  });

  it('validates loan QR response data schema', () => {
    const valid = loanQrResponseDataSchema.safeParse({
      loan_id: 'a0000000-0000-0000-0000-000000000001',
      loan_no: 'PJM-20261109-0001',
      qr_token: 'dGhpcy1pcy1hLXF1aXJreS10b2tlbg',
    });
    expect(valid.success).toBe(true);

    const emptyToken = loanQrResponseDataSchema.safeParse({
      loan_id: 'a0000000-0000-0000-0000-000000000001',
      loan_no: 'PJM-20261109-0001',
      qr_token: '',
    });
    expect(emptyToken.success).toBe(false);
  });

  it('validates admin loans query defaults and bounds', () => {
    const parsed = adminLoansQuerySchema.parse({});
    expect(parsed.page).toBe(1);
    expect(parsed.limit).toBe(10);
    expect(parsed.status).toBeUndefined();
    expect(parsed.q).toBeUndefined();

    const filtered = adminLoansQuerySchema.parse({
      status: 'BORROWED',
      q: 'clean',
      page: '2',
      limit: '20',
    });
    expect(filtered.status).toBe('BORROWED');
    expect(filtered.q).toBe('clean');
    expect(filtered.page).toBe(2);
    expect(filtered.limit).toBe(20);
  });

  it('computes fine amount according to domain rules', () => {
    expect(computeFineAmount(0, 'Belum Bayar')).toBe(0);
    expect(computeFineAmount(1, 'Belum Bayar')).toBe(2000);
    expect(computeFineAmount(4, 'Belum Bayar')).toBe(2000);
    expect(computeFineAmount(5, 'Belum Bayar')).toBeNull();
    expect(computeFineAmount(6, 'Belum Bayar')).toBeNull();

    // Sudah Bayar: uses stored fine amount
    expect(computeFineAmount(5, 'Sudah Bayar', 50000)).toBe(50000);
    expect(computeFineAmount(2, 'Sudah Bayar', 2000)).toBe(2000);
    expect(computeFineAmount(1, 'Sudah Bayar', null)).toBe(2000);
  });

  it('excludes PENDING from admin loan statuses', () => {
    expect(ADMIN_LOAN_STATUSES).not.toContain('PENDING');
    expect(ADMIN_LOAN_STATUSES).toEqual([
      'BORROWED',
      'OVERDUE',
      'RETURN_PENDING',
      'FINE_PENDING',
      'RETURNED',
    ]);
  });

  it('validates admin loan item schema', () => {
    const valid = adminLoanItemSchema.safeParse({
      id: 'a0000000-0000-0000-0000-000000000001',
      loan_no: 'PJM-20261101-0001',
      borrower_name: 'Budi Santoso',
      book_title: 'Clean Architecture',
      book_author: 'Robert C. Martin',
      book_cover_url: '/api/v1/covers/clean.jpg',
      confirmed_at: '2026-11-01T03:00:00.000Z',
      due_date: '2026-11-08',
      status: 'BORROWED',
      status_label: 'Sedang Dipinjam',
      late_days: 0,
      fine_amount: 0,
      fine_status: 'Belum Bayar',
    });
    expect(valid.success).toBe(true);
  });

  it('validates admin loan detail data schema', () => {
    const valid = adminLoanDetailDataSchema.safeParse({
      id: 'a0000000-0000-0000-0000-000000000001',
      loan_no: 'PJM-20261101-0001',
      status: 'FINE_PENDING',
      status_label: 'Pending Keterlambatan',
      borrower: {
        id: 'b0000000-0000-0000-0000-000000000001',
        full_name: 'Budi Santoso',
        email: 'budi@example.com',
      },
      book: {
        id: 'c0000000-0000-0000-0000-000000000001',
        title: 'Pragmatic Programmer',
        author: 'Andy Hunt',
        publisher: 'Addison-Wesley',
        publication_year: 1999,
        synopsis: 'Classic dev book',
        cover_url: '/api/v1/covers/prag.jpg',
        genres: ['Software Engineering'],
      },
      confirmed_at: '2026-11-01T03:00:00.000Z',
      due_date: '2026-11-08',
      return_requested_at: '2026-11-10T03:00:00.000Z',
      late_days: 2,
      fine_amount: 2000,
      fine_status: 'Belum Bayar',
      can_pay_fine: true,
      can_confirm_return: false,
    });
    expect(valid.success).toBe(true);
  });
});
