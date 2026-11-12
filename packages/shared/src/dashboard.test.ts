import { describe, expect, it } from 'bun:test';
import {
  dashboardPieChartSchema,
  dashboardSummaryDataSchema,
  dashboardSummaryResponseSchema,
} from './dashboard';

describe('shared dashboard schemas (BE-S2-04 / US-04 / AC-04.01)', () => {
  it('validates a correct dashboard summary data payload', () => {
    const validData = {
      totalBooks: 123,
      totalAvailability: 98,
      borrowedCount: 25,
      overdueCount: 7,
      returnedCount: 50,
      pieChart: {
        onTime: 40,
        late: 10,
      },
    };

    const parsed = dashboardSummaryDataSchema.safeParse(validData);
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data).toEqual(validData);
    }
  });

  it('validates a complete dashboard summary response envelope with message', () => {
    const validResponse = {
      data: {
        totalBooks: 12,
        totalAvailability: 8,
        borrowedCount: 2,
        overdueCount: 6,
        returnedCount: 2,
        pieChart: {
          onTime: 1,
          late: 1,
        },
      },
      message: 'ok',
    };

    const parsed = dashboardSummaryResponseSchema.safeParse(validResponse);
    expect(parsed.success).toBe(true);
  });

  it('rejects negative numbers in metrics', () => {
    const invalidData = {
      totalBooks: -1,
      totalAvailability: 8,
      borrowedCount: 2,
      overdueCount: 6,
      returnedCount: 2,
      pieChart: {
        onTime: 1,
        late: 1,
      },
    };

    const parsed = dashboardSummaryDataSchema.safeParse(invalidData);
    expect(parsed.success).toBe(false);
  });

  it('rejects non-integer values in metrics', () => {
    const invalidData = {
      totalBooks: 12.5,
      totalAvailability: 8,
      borrowedCount: 2,
      overdueCount: 6,
      returnedCount: 2,
      pieChart: {
        onTime: 1,
        late: 1,
      },
    };

    const parsed = dashboardSummaryDataSchema.safeParse(invalidData);
    expect(parsed.success).toBe(false);
  });

  it('rejects missing pieChart in summary data', () => {
    const invalidData = {
      totalBooks: 12,
      totalAvailability: 8,
      borrowedCount: 2,
      overdueCount: 6,
      returnedCount: 2,
    };

    const parsed = dashboardSummaryDataSchema.safeParse(invalidData);
    expect(parsed.success).toBe(false);
  });

  it('validates pie chart schema independently', () => {
    expect(
      dashboardPieChartSchema.safeParse({ onTime: 0, late: 0 }).success,
    ).toBe(true);
    expect(
      dashboardPieChartSchema.safeParse({ onTime: -1, late: 0 }).success,
    ).toBe(false);
  });
});

