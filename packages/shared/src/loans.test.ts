import { describe, expect, it } from 'bun:test';
import {
  ADMIN_LOAN_STATUSES,
  adminLoanDetailDataSchema,
  adminLoanItemSchema,
  adminLoansQuerySchema,
  computeFineAmount,
} from './loans';

describe('shared loans schemas & computeFineAmount (BE-S3-01 / US-06)', () => {
  it('computes fine amount for Belum Bayar and Sudah Bayar across late days boundaries', () => {
    // Belum Bayar: follows calculateFine
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

  it('validates admin loans query schema defaults and pagination bounds', () => {
    const defaultParsed = adminLoansQuerySchema.parse({});
    expect(defaultParsed.page).toBe(1);
    expect(defaultParsed.limit).toBe(10);
    expect(defaultParsed.status).toBeUndefined();
    expect(defaultParsed.q).toBeUndefined();

    for (const status of ADMIN_LOAN_STATUSES) {
      const parsed = adminLoansQuerySchema.parse({ status });
      expect(parsed.status).toBe(status);
    }

    // PENDING is not allowed in admin loans list query (Q-25)
    expect(() => adminLoansQuerySchema.parse({ status: 'PENDING' })).toThrow();
    expect(() => adminLoansQuerySchema.parse({ status: 'INVALID' })).toThrow();

    // Limit bounds
    expect(adminLoansQuerySchema.parse({ limit: '50' }).limit).toBe(50);
    expect(() => adminLoansQuerySchema.parse({ limit: '51' })).toThrow();
    expect(() => adminLoansQuerySchema.parse({ limit: '0' })).toThrow();
    expect(() => adminLoansQuerySchema.parse({ page: '0' })).toThrow();
  });

  it('validates admin loan list item schema', () => {
    const validItem = {
      id: '00000000-0000-4000-8003-000000000002',
      loan_no: 'PJM-20261109-0002',
      borrower_name: 'Member Satu',
      book_title: 'Clean Architecture',
      book_author: 'Robert C. Martin',
      book_cover_url: '/api/v1/covers/clean-arch.jpg',
      confirmed_at: '2026-11-09T03:00:00.000Z',
      due_date: '2026-11-12',
      status: 'BORROWED' as const,
      status_label: 'Sedang Dipinjam',
      late_days: 0,
      fine_amount: 0,
      fine_status: 'Belum Bayar' as const,
    };

    expect(adminLoanItemSchema.parse(validItem)).toEqual(validItem);

    // Rejects PENDING status in admin loan item
    expect(() =>
      adminLoanItemSchema.parse({ ...validItem, status: 'PENDING' }),
    ).toThrow();
  });

  it('validates admin loan detail data schema including action flags', () => {
    const validDetail = {
      id: '00000000-0000-4000-8003-000000000008',
      loan_no: 'PJM-20261109-0008',
      status: 'FINE_PENDING' as const,
      status_label: 'Pending Keterlambatan',
      borrower: {
        id: '00000000-0000-8001-8001-000000000002',
        full_name: 'Member Satu',
        email: 'member1@readonly.ppu.co.id',
      },
      book: {
        id: '00000000-0000-4000-8002-000000000008',
        title: 'Laut Bercerita',
        author: 'Leila S. Chudori',
        publisher: 'KPG',
        publication_year: 2017,
        synopsis: 'Kisah para aktivis 1998.',
        cover_url: '/api/v1/covers/laut-bercerita.jpg',
        genres: ['Drama', 'Fiksi Sejarah'],
      },
      confirmed_at: '2026-11-01T03:00:00.000Z',
      due_date: '2026-11-08',
      return_requested_at: '2026-11-10T03:00:00.000Z',
      late_days: 5,
      fine_amount: null,
      fine_status: 'Belum Bayar' as const,
      can_pay_fine: true,
      can_confirm_return: false,
    };

    expect(adminLoanDetailDataSchema.parse(validDetail)).toEqual(validDetail);
  });
});

