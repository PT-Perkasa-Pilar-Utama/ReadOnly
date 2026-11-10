import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import {
  type DashboardSummary,
  getDashboardSummary,
  getReturnDistribution,
} from './dashboard';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('Dashboard API', () => {
  test('mengambil seluruh metrik Dashboard dari endpoint backend', async () => {
    const summary: DashboardSummary = {
      totalBooks: 25,
      totalAvailability: 18,
      borrowedCount: 4,
      overdueCount: 2,
      returnedCount: 12,
      pieChart: {
        onTime: 9,
        late: 3,
      },
    };
    const fetchMock = spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ data: summary, message: 'ok' }),
    );

    await expect(getDashboardSummary()).resolves.toEqual(summary);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      '/api/v1/admin/dashboard/summary',
    );
  });

  test('menolak ringkasan Dashboard dengan struktur yang tidak sesuai', async () => {
    spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({
        data: {
          totalBooks: '25',
          totalAvailability: 18,
          borrowedCount: 4,
          overdueCount: 2,
          returnedCount: 12,
          pieChart: { onTime: 9, late: 3 },
        },
      }),
    );

    await expect(getDashboardSummary()).rejects.toThrow(
      'Format data dashboard tidak sesuai.',
    );
  });
});

describe('getReturnDistribution', () => {
  test('menghitung persentase pengembalian tepat waktu dan terlambat', () => {
    expect(getReturnDistribution({ onTime: 9, late: 3 })).toEqual({
      total: 12,
      onTimePercentage: 75,
      latePercentage: 25,
    });
  });

  test('mengembalikan persentase nol saat belum ada data pengembalian', () => {
    expect(getReturnDistribution({ onTime: 0, late: 0 })).toEqual({
      total: 0,
      onTimePercentage: 0,
      latePercentage: 0,
    });
  });
});
