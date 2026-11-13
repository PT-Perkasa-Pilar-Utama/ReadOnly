import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import {
  confirmLoanQr,
  confirmLoanReturn,
  createLoan,
  getFineAmountValidationMessage,
  getLoanQr,
  getMyLoans,
  getRatingValidationMessage,
  payLoanFine,
  previewLoanQr,
  requestLoanReturn,
} from './loan-workflows';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

const memberLoan = {
  id: 'loan-1',
  loan_no: 'PJM-20261110-0001',
  book_id: 'book-1',
  book_title: 'Bumi Manusia',
  book_author: 'Pramoedya Ananta Toer',
  book_cover_url: null,
  requested_at: '2026-11-10T03:00:00.000Z',
  due_date: null,
  status: 'PENDING',
  status_label: 'Pending Peminjaman',
  member_action: 'QR',
} as const;

describe('Member and Admin loan workflows API', () => {
  test('member submits a loan request', async () => {
    const fetchMock = spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({
        data: {
          id: 'loan-1',
          loan_no: 'PJM-20261110-0001',
          status: 'PENDING',
          status_label: 'Pending Peminjaman',
        },
        message: 'Pengajuan peminjaman berhasil',
      }),
    );

    await expect(createLoan('book-1')).resolves.toMatchObject({
      data: { id: 'loan-1', status: 'PENDING' },
    });
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/v1/loans');
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify({ book_id: 'book-1' }),
      credentials: 'include',
    });
  });

  test('member loan list reads pagination', async () => {
    const fetchMock = spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({
        data: [memberLoan],
        pagination: { page: 2, limit: 10, total: 11, totalPages: 2 },
      }),
    );

    await expect(getMyLoans(2, 10)).resolves.toMatchObject({
      loans: [{ id: 'loan-1', member_action: 'QR' }],
      pagination: { page: 2, total: 11, totalPages: 2 },
    });
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      '/api/v1/loans/me?page=2&limit=10',
    );
  });

  test('rating requires an integer score from 1 through 5', () => {
    expect(getRatingValidationMessage(0)).toBe('Rating wajib diisi');
    expect(getRatingValidationMessage(1)).toBe(null);
    expect(getRatingValidationMessage(5)).toBe(null);
    expect(getRatingValidationMessage(6)).toBe('Rating wajib diisi');
    expect(getRatingValidationMessage(2.5)).toBe('Rating wajib diisi');
  });

  test('manual fine requires a positive integer', () => {
    expect(getFineAmountValidationMessage('')).toBe(
      'Biaya denda wajib diisi dengan angka',
    );
    expect(getFineAmountValidationMessage('1.5')).toBe(
      'Biaya denda wajib diisi dengan angka',
    );
    expect(getFineAmountValidationMessage('0')).toBe(
      'Biaya denda wajib diisi dengan angka',
    );
    expect(getFineAmountValidationMessage('100')).toBe(null);
    expect(getFineAmountValidationMessage('99999999')).toBe(null);
    expect(getFineAmountValidationMessage('100000000')).toBe(
      'Biaya denda wajib diisi dengan angka',
    );
  });

  test('member requests a one-time QR token', async () => {
    const fetchMock = spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({
        data: {
          loan_id: 'loan-1',
          loan_no: 'PJM-1',
          qr_token: 'one-time-token',
          manual_code: 'PJM-7K9M2P',
        },
      }),
    );

    await expect(getLoanQr('loan-1')).resolves.toEqual({
      loan_id: 'loan-1',
      loan_no: 'PJM-1',
      qr_token: 'one-time-token',
      manual_code: 'PJM-7K9M2P',
    });
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/v1/loans/loan-1/qr');
  });

  test('Admin previews a scanned QR token', async () => {
    const preview = {
      loan_id: 'loan-1',
      loan_no: 'PJM-1',
      borrower_name: 'Member Test',
      requested_at: '2026-11-10T03:00:00.000Z',
      loan_duration_days: 7,
      book: {
        id: 'book-1',
        title: 'Bumi Manusia',
        author: 'Pramoedya Ananta Toer',
        publisher: 'Lentera Dipantara',
        publication_year: 1980,
        cover_url: null,
        genres: ['Fiksi'],
      },
    };
    const fetchMock = spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({ data: preview }),
    );

    await expect(previewLoanQr('one-time-token')).resolves.toEqual(preview);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/v1/admin/loans/qr/preview');
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify({ qr_token: 'one-time-token' }),
    });
  });

  test('invalid QR token keeps the backend error copy', async () => {
    spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json(
        {
          statusCode: 422,
          error: 'Unprocessable Entity',
          code: 'invalid_token',
          message: 'QR Code tidak valid',
        },
        { status: 422 },
      ),
    );

    await expect(previewLoanQr('invalid-token')).rejects.toMatchObject({
      message: 'QR Code tidak valid',
    });
  });

  test('Admin consumes the QR token to confirm the loan', async () => {
    const fetchMock = spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({
        data: {
          loan_id: 'loan-1',
          status: 'BORROWED',
          status_label: 'Sedang Dipinjam',
          due_date: '2026-11-17',
        },
        message: 'Buku berhasil Dipinjam',
      }),
    );

    await expect(confirmLoanQr('one-time-token')).resolves.toMatchObject({
      data: { status: 'BORROWED', status_label: 'Sedang Dipinjam' },
    });
    expect(fetchMock.mock.calls[0]?.[0]).toBe('/api/v1/admin/loans/qr/confirm');
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify({ qr_token: 'one-time-token' }),
    });
  });

  test('Member return request sends the rating score', async () => {
    const fetchMock = spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({
        data: {
          loan_id: 'loan-1',
          status: 'RETURN_PENDING',
          status_label: 'Pending Pengembalian',
        },
        message: 'Pengembalian diajukan',
      }),
    );

    await expect(requestLoanReturn('loan-1', 5)).resolves.toMatchObject({
      data: { status: 'RETURN_PENDING' },
    });
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify({ score: 5 }),
    });
  });

  test('Admin pays automatic fines without a client amount', async () => {
    const fetchMock = spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({
        data: {
          loan_id: 'loan-1',
          fine_amount: 2000,
          fine_status: 'Sudah Bayar',
        },
        message: 'Denda Berhasil Dibayar',
      }),
    );

    await expect(payLoanFine('loan-1')).resolves.toMatchObject({
      data: { fine_amount: 2000, fine_status: 'Sudah Bayar' },
    });
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify({}),
    });
  });

  test('Admin pays a manual fine with the submitted amount', async () => {
    const fetchMock = spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({
        data: {
          loan_id: 'loan-1',
          fine_amount: 7500,
          fine_status: 'Sudah Bayar',
        },
        message: 'Denda Berhasil Dibayar',
      }),
    );

    await expect(payLoanFine('loan-1', 7500)).resolves.toMatchObject({
      data: { fine_amount: 7500, fine_status: 'Sudah Bayar' },
    });
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      '/api/v1/admin/loans/loan-1/fine-payment',
    );
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({
      method: 'POST',
      body: JSON.stringify({ amount: 7500 }),
    });
  });

  test('Admin confirms book return', async () => {
    const fetchMock = spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({
        data: {
          loan_id: 'loan-1',
          status: 'RETURNED',
          status_label: 'Sudah Dikembalikan',
        },
        message: 'Buku berhasil Dikembalikan',
      }),
    );

    await expect(confirmLoanReturn('loan-1')).resolves.toMatchObject({
      data: { status: 'RETURNED' },
    });
    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      '/api/v1/admin/loans/loan-1/return-confirmation',
    );
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: 'POST' });
  });
});
