import { describe, expect, test } from 'bun:test';
import { getReturnDistribution } from './dashboard';

describe('getReturnDistribution', () => {
  test('menghitung persentase sesuai data seed QA', () => {
    expect(getReturnDistribution({ onTime: 1, late: 1 })).toEqual({
      total: 2,
      onTimePercentage: 50,
      latePercentage: 50,
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
