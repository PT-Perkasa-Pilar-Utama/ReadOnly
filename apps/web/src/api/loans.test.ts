import { describe, expect, test } from 'bun:test';
import {
  ADMIN_LOAN_STATUSES,
  formatLoanAmount,
  formatLoanDate,
  getLoanStatusClass,
  getLoanStatusLabel,
} from './loans';

describe('Manajemen Peminjaman frontend helpers', () => {
  test('daftar status admin tidak memasukkan PENDING', () => {
    expect(ADMIN_LOAN_STATUSES).toEqual([
      'BORROWED',
      'OVERDUE',
      'RETURN_PENDING',
      'FINE_PENDING',
      'RETURNED',
    ]);
  });

  test('menggunakan label status kanonik project', () => {
    expect(getLoanStatusLabel('OVERDUE')).toBe('Terlambat');
    expect(getLoanStatusLabel('RETURN_PENDING')).toBe('Pending Pengembalian');
    expect(getLoanStatusLabel('FINE_PENDING')).toBe('Pending Keterlambatan');
    expect(getLoanStatusLabel('BORROWED', 'Sedang Dipinjam')).toBe('Sedang Dipinjam');
  });

  test('format denda tidak mengarang nominal ketika nilai null', () => {
    expect(formatLoanAmount(2000)).toBe('Rp 2.000');
    expect(formatLoanAmount(null)).toBe('-');
  });

  test('format status class stabil untuk kode API', () => {
    expect(getLoanStatusClass('RETURN_PENDING')).toBe(
      'loan-status-badge--return-pending',
    );
  });

  test('tanggal kalender diformat dalam bahasa Indonesia', () => {
    expect(formatLoanDate('2026-11-09')).toContain('November');
    expect(formatLoanDate(null)).toBe('-');
  });
});
