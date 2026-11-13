import { describe, expect, it } from 'bun:test';
import {
  ADMIN_LOAN_STATUSES,
  adminLoanDetailDataSchema,
  adminLoanItemSchema,
  adminLoansQuerySchema,
  computeFineAmount,
  createLoanInputSchema,
  createLoanResponseDataSchema,
  FINE_PAYMENT_SUCCESS_MESSAGE,
  FINE_REQUIRED_MESSAGE,
  finePaymentInputSchema,
  finePaymentResponseSchema,
  LOAN_STATUSES,
  loanQrResponseDataSchema,
  MEMBER_ACTIONS,
  myLoanItemSchema,
  myLoansQuerySchema,
  qrConfirmResponseSchema,
  qrPreviewResponseSchema,
  qrTokenInputSchema,
  RATING_REQUIRED_MESSAGE,
  RETURN_CONFIRM_SUCCESS_MESSAGE,
  RETURN_SUCCESS_MESSAGE,
  returnConfirmResponseSchema,
  returnLoanInputSchema,
  returnLoanResponseSchema,
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
      manual_code: 'PJM-7K9M2P',
    });
    expect(valid.success).toBe(true);

    const emptyToken = loanQrResponseDataSchema.safeParse({
      loan_id: 'a0000000-0000-0000-0000-000000000001',
      loan_no: 'PJM-20261109-0001',
      qr_token: '',
      manual_code: 'PJM-7K9M2P',
    });
    expect(emptyToken.success).toBe(false);

    const invalidManualCode = loanQrResponseDataSchema.safeParse({
      loan_id: 'a0000000-0000-0000-0000-000000000001',
      loan_no: 'PJM-20261109-0001',
      qr_token: 'dGhpcy1pcy1hLXF1aXJreS10b2tlbg',
      manual_code: 'PJM-0011OO',
    });
    expect(invalidManualCode.success).toBe(false);
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

  it('validates qrTokenInputSchema and rejects empty tokens with verbatim AC-08.06 message', () => {
    expect(qrTokenInputSchema.parse({ qr_token: 'valid-token-123' })).toEqual({
      qr_token: 'valid-token-123',
    });

    expect(() => qrTokenInputSchema.parse({ qr_token: '' })).toThrow(
      'QR Code tidak valid',
    );
    expect(() => qrTokenInputSchema.parse({ qr_token: '   ' })).toThrow(
      'QR Code tidak valid',
    );
    expect(() => qrTokenInputSchema.parse({})).toThrow();
  });

  it('validates qrPreviewResponseSchema', () => {
    const validPreview = {
      data: {
        loan_id: '00000000-0000-4000-8003-000000000001',
        loan_no: 'PJM-20261109-0001',
        borrower_name: 'Member Satu',
        requested_at: '2026-11-09T03:00:00.000Z',
        loan_duration_days: 7,
        book: {
          id: '00000000-0000-4000-8002-000000000001',
          title: 'Clean Code',
          author: 'Robert C. Martin',
          publisher: 'Prentice Hall',
          publication_year: 2008,
          cover_url: '/api/v1/covers/clean-code.jpg',
          genres: ['Teknologi'],
        },
      },
    };

    expect(qrPreviewResponseSchema.parse(validPreview)).toEqual(validPreview);
  });

  it('validates qrConfirmResponseSchema', () => {
    const validConfirm = {
      data: {
        loan_id: '00000000-0000-4000-8003-000000000001',
        status: 'BORROWED' as const,
        status_label: 'Sedang Dipinjam' as const,
        due_date: '2026-11-16',
      },
      message: 'Buku berhasil Dipinjam',
    };

    expect(qrConfirmResponseSchema.parse(validConfirm)).toEqual(validConfirm);
  });

  it('validates returnLoanInputSchema and enforces rating 1-5 mandatory (AC-09.06)', () => {
    for (const validScore of [1, 2, 3, 4, 5]) {
      const res = returnLoanInputSchema.safeParse({ score: validScore });
      expect(res.success).toBe(true);
    }

    const invalidCases = [
      {},
      { score: undefined },
      { score: null },
      { score: 0 },
      { score: 6 },
      { score: 3.5 },
      { score: '5' },
      { score: -1 },
    ];

    for (const bad of invalidCases) {
      const res = returnLoanInputSchema.safeParse(bad);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0]?.message).toBe(RATING_REQUIRED_MESSAGE);
      }
    }
  });

  it('validates returnLoanResponseSchema', () => {
    const validResponse = {
      data: {
        loan_id: '00000000-0000-4000-8003-000000000001',
        status: 'RETURN_PENDING' as const,
        status_label: 'Pending Pengembalian',
      },
      message: RETURN_SUCCESS_MESSAGE,
    };

    expect(returnLoanResponseSchema.parse(validResponse)).toEqual(
      validResponse,
    );
  });

  it('validates finePaymentInputSchema and enforces number validation (AC-09.09)', () => {
    expect(finePaymentInputSchema.safeParse({}).success).toBe(true);
    expect(finePaymentInputSchema.safeParse({ amount: 2000 }).success).toBe(
      true,
    );
    expect(
      finePaymentInputSchema.safeParse({ amount: 99_999_999 }).success,
    ).toBe(true);

    const invalidCases = [
      { amount: '2000' },
      { amount: 0 },
      { amount: -500 },
      { amount: 1.5 },
      { amount: 100_000_000 },
      { amount: null },
    ];

    for (const bad of invalidCases) {
      const res = finePaymentInputSchema.safeParse(bad);
      expect(res.success).toBe(false);
      if (!res.success) {
        expect(res.error.issues[0]?.message).toBe(FINE_REQUIRED_MESSAGE);
      }
    }
  });

  it('validates finePaymentResponseSchema', () => {
    const valid = {
      data: {
        loan_id: '00000000-0000-4000-8003-000000000001',
        fine_amount: 2000,
        fine_status: 'Sudah Bayar' as const,
      },
      message: FINE_PAYMENT_SUCCESS_MESSAGE,
    };

    expect(finePaymentResponseSchema.parse(valid)).toEqual(valid);
  });

  it('validates returnConfirmResponseSchema', () => {
    const valid = {
      data: {
        loan_id: '00000000-0000-4000-8003-000000000001',
        status: 'RETURNED' as const,
        status_label: 'Sudah Dikembalikan' as const,
      },
      message: RETURN_CONFIRM_SUCCESS_MESSAGE,
    };

    expect(returnConfirmResponseSchema.parse(valid)).toEqual(valid);
  });
});
