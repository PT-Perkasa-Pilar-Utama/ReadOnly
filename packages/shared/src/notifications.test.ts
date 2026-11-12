import { describe, expect, it } from 'bun:test';
import {
  loginPopupItemSchema,
  notificationItemSchema,
  notificationsQuerySchema,
  notificationsResponseSchema,
} from './notifications';

describe('shared notifications schemas (BE-S3-05 / US-10)', () => {
  it('validates query schema with defaults and limits', () => {
    const defaultQuery = notificationsQuerySchema.parse({});
    expect(defaultQuery.page).toBe(1);
    expect(defaultQuery.limit).toBe(10);

    const customQuery = notificationsQuerySchema.parse({
      page: '2',
      limit: '25',
    });
    expect(customQuery.page).toBe(2);
    expect(customQuery.limit).toBe(25);

    expect(() =>
      notificationsQuerySchema.parse({
        page: 0,
      }),
    ).toThrow();

    expect(() =>
      notificationsQuerySchema.parse({
        limit: 51,
      }),
    ).toThrow();
  });

  it('validates notificationItemSchema against API spec contract', () => {
    const validItem = {
      id: '00000000-0000-0000-0000-000000000001',
      loan_id: '00000000-0000-0000-0000-000000000002',
      type: 'DUE_SOON_3D' as const,
      title: 'Batas pengembalian 3 hari lagi',
      text: 'Bumi Manusia perlu dikembalikan paling lambat 16 November 2026.',
      book_title: 'Bumi Manusia',
      due_date: '2026-11-16',
      created_at: '2026-11-13T00:05:00.000Z',
    };

    const parsed = notificationItemSchema.parse(validItem);
    expect(parsed.id).toBe(validItem.id);
    expect(parsed.type).toBe('DUE_SOON_3D');

    expect(() =>
      notificationItemSchema.parse({
        ...validItem,
        type: 'INVALID_TYPE',
      }),
    ).toThrow();
  });

  it('validates loginPopupItemSchema discriminated union for OVERDUE, DUE_TODAY, and DUE_SOON', () => {
    const overduePopup = {
      condition: 'OVERDUE' as const,
      books: [
        {
          loan_id: '00000000-0000-0000-0000-000000000001',
          book_title: 'Laskar Pelangi',
          due_date: '2026-11-05',
          late_days: 4,
          message:
            'Laskar Pelangi terlambat 4 hari. Segera ajukan pengembalian.',
        },
      ],
    };

    const parsedOverdue = loginPopupItemSchema.parse(overduePopup);
    expect(parsedOverdue.condition).toBe('OVERDUE');
    expect(parsedOverdue.books.length).toBe(1);

    const dueTodayPopup = {
      condition: 'DUE_TODAY' as const,
      books: [
        {
          loan_id: '00000000-0000-0000-0000-000000000002',
          book_title: 'Filosofi Teras',
          due_date: '2026-11-09',
          message: 'Filosofi Teras jatuh tempo hari ini. Silakan dikembalikan.',
        },
      ],
    };

    const parsedDueToday = loginPopupItemSchema.parse(dueTodayPopup);
    expect(parsedDueToday.condition).toBe('DUE_TODAY');

    const dueSoonPopup = {
      condition: 'DUE_SOON' as const,
      books: [
        {
          loan_id: '00000000-0000-0000-0000-000000000003',
          book_title: 'Bumi Manusia',
          due_date: '2026-11-11',
          remaining_days: 2,
          message: 'Batas pengembalian 2 hari lagi',
        },
      ],
    };

    const parsedDueSoon = loginPopupItemSchema.parse(dueSoonPopup);
    expect(parsedDueSoon.condition).toBe('DUE_SOON');
  });

  it('validates full notificationsResponseSchema envelope', () => {
    const fullEnvelope = {
      data: [
        {
          id: '00000000-0000-0000-0000-000000000001',
          loan_id: '00000000-0000-0000-0000-000000000002',
          type: 'DUE_SOON_3D' as const,
          title: 'Batas pengembalian 3 hari lagi',
          text: 'Bumi Manusia perlu dikembalikan paling lambat 16 November 2026.',
          book_title: 'Bumi Manusia',
          due_date: '2026-11-16',
          created_at: '2026-11-13T00:05:00.000Z',
        },
      ],
      login_popups: [
        {
          condition: 'OVERDUE' as const,
          books: [
            {
              loan_id: '00000000-0000-0000-0000-000000000003',
              book_title: 'Laskar Pelangi',
              due_date: '2026-11-05',
              late_days: 4,
              message:
                'Laskar Pelangi terlambat 4 hari. Segera ajukan pengembalian.',
            },
          ],
        },
      ],
      pagination: {
        page: 1,
        limit: 10,
        total: 1,
        totalPages: 1,
      },
    };

    const parsed = notificationsResponseSchema.parse(fullEnvelope);
    expect(parsed.data.length).toBe(1);
    expect(parsed.login_popups.length).toBe(1);
    expect(parsed.pagination.total).toBe(1);
  });
});
