import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import {
  ADMIN_LOAN_STATUSES,
  type AdminLoanDetail,
  type AdminLoanListItem,
  formatLoanAmount,
  formatLoanDate,
  getAdminLoanDetail,
  getAdminLoans,
  getLoanStatusClass,
  getLoanStatusLabel,
} from './loans';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

describe('Manajemen Peminjaman API', () => {
  test('mengambil daftar lima status peminjaman dari backend', async () => {
    const loan: AdminLoanListItem = {
      id: 'loan-1',
      loan_no: 'PJM-20261110-0001',
      borrower_name: 'Member Contoh',
      book_title: 'Judul Buku',
      book_author: 'Penulis Contoh',
      book_cover_url: null,
      confirmed_at: '2026-11-01T03:00:00.000Z',
      due_date: '2026-11-08',
      status: 'OVERDUE',
      status_label: 'Terlambat',
      late_days: 2,
      fine_amount: 2000,
      fine_status: 'Belum Bayar',
    };
    const fetchMock = spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({
        data: [loan],
        pagination: { page: 2, limit: 10, total: 11, totalPages: 2 },
      }),
    );

    await expect(
      getAdminLoans({ q: 'Member', status: 'OVERDUE', page: 2, limit: 10 }),
    ).resolves.toEqual({
      loans: [loan],
      pagination: { page: 2, limit: 10, total: 11, totalPages: 2 },
    });
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      '/api/v1/admin/loans?page=2&limit=10&status=OVERDUE&q=Member',
    );
  });

  test('menolak daftar peminjaman tanpa metadata paginasi dari backend', async () => {
    spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ data: [] }));

    await expect(getAdminLoans()).rejects.toMatchObject({
      statusCode: 502,
      code: 'invalid_response',
    });
  });

  test('mengambil detail pinjaman berdasarkan ID dari backend', async () => {
    const detail: AdminLoanDetail = {
      id: 'loan-1',
      loan_no: 'PJM-20261110-0001',
      status: 'OVERDUE',
      status_label: 'Terlambat',
      borrower: {
        id: 'member-1',
        full_name: 'Member Contoh',
        email: 'member@example.test',
      },
      book: {
        id: 'book-1',
        title: 'Judul Buku',
        author: 'Penulis Contoh',
        publisher: 'Penerbit Contoh',
        publication_year: 2024,
        synopsis: 'Sinopsis buku.',
        cover_url: null,
        genres: ['Fiksi'],
      },
      confirmed_at: '2026-11-01T03:00:00.000Z',
      due_date: '2026-11-08',
      return_requested_at: null,
      late_days: 2,
      fine_amount: 2000,
      fine_status: 'Belum Bayar',
      can_pay_fine: false,
      can_confirm_return: false,
    };
    const fetchMock = spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ data: detail }),
    );

    await expect(getAdminLoanDetail('loan-1')).resolves.toEqual(detail);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/v1/admin/loans/loan-1');
  });
});

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
    expect(getLoanStatusLabel('BORROWED', 'Sedang Dipinjam')).toBe(
      'Sedang Dipinjam',
    );
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
