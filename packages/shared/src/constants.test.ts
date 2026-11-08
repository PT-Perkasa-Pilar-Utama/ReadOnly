import { describe, expect, it } from 'bun:test';
import {
  calculateFine,
  FINE_AUTO_MAX_DAYS,
  FINE_FLAT_AMOUNT,
  FINE_MANUAL_MAX,
  FINE_MANUAL_MIN_DAYS,
  LOAN_DURATION_DAYS,
  LOAN_STATUS_LABELS,
  LOAN_STATUSES,
  MAX_COVER_SIZE_BYTES,
  REMINDER_DAYS_BEFORE_DUE,
} from './constants';

describe('domain constants & calculateFine', () => {
  it('calculates fine across required boundary late days (0, 1, 4, 5, 6)', () => {
    expect(calculateFine(-1)).toBe(0);
    expect(calculateFine(0)).toBe(0);
    expect(calculateFine(1)).toBe(2000);
    expect(calculateFine(4)).toBe(2000);
    expect(calculateFine(5)).toBeNull();
    expect(calculateFine(6)).toBeNull();
  });

  it('defines canonical business constants matching spec 11 & 12', () => {
    expect(LOAN_DURATION_DAYS).toBe(7);
    expect(REMINDER_DAYS_BEFORE_DUE).toBe(3);
    expect(FINE_FLAT_AMOUNT).toBe(2000);
    expect(FINE_AUTO_MAX_DAYS).toBe(4);
    expect(FINE_MANUAL_MIN_DAYS).toBe(5);
    expect(FINE_MANUAL_MAX).toBe(99_999_999);
    expect(MAX_COVER_SIZE_BYTES).toBe(5 * 1024 * 1024);
  });

  it('maps all 6 canonical loan statuses to verbatim Indonesian UI labels', () => {
    expect(LOAN_STATUSES).toEqual([
      'PENDING',
      'BORROWED',
      'OVERDUE',
      'RETURN_PENDING',
      'FINE_PENDING',
      'RETURNED',
    ]);
    expect(LOAN_STATUS_LABELS.PENDING).toBe('Pending Peminjaman');
    expect(LOAN_STATUS_LABELS.BORROWED).toBe('Sedang Dipinjam');
    expect(LOAN_STATUS_LABELS.OVERDUE).toBe('Terlambat');
    expect(LOAN_STATUS_LABELS.RETURN_PENDING).toBe('Pending Pengembalian');
    expect(LOAN_STATUS_LABELS.FINE_PENDING).toBe('Pending Keterlambatan');
    expect(LOAN_STATUS_LABELS.RETURNED).toBe('Sudah Dikembalikan');
  });
});
