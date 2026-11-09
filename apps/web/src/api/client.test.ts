import { afterEach, describe, expect, spyOn, test } from 'bun:test';
import { z } from 'zod';
import { ApiError, json, onUnauthorized, request } from './client';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; onUnauthorized(() => {}); });
describe('API client produksi', () => {
  test('mengirim JSON dan cookie sesi tanpa token di storage', async () => {
    const fetchMock = spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ data: { id: '1' } }));
    expect(await request('/example', z.object({ data: z.object({ id: z.string() }) }), json('POST', { name: 'Uji' }))).toEqual({ data: { id: '1' } });
    expect(fetchMock).toHaveBeenCalledWith('/api/v1/example', { method: 'POST', body: '{"name":"Uji"}', credentials: 'include', headers: { 'Content-Type': 'application/json' } });
  });
  test('AC-03.01: respons logout 204 tidak diparse sebagai JSON', async () => {
    spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 204 })); expect(await request('/auth/logout', z.undefined(), { method: 'POST' })).toBeUndefined();
  });
  test('AC-12.07: pesan error berdasarkan code tetap sesuai AC', async () => {
    spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ statusCode: 403, error: 'Forbidden', code: 'account_inactive', message: 'Different server wording' }, { status: 403 }));
    await expect(request('/auth/login', z.unknown())).rejects.toMatchObject({ status: 403, message: 'Akun Anda tidak aktif. Silakan hubungi Admin Perpus.' });
  });
  test('validasi server mempertahankan nama field untuk pesan inline', async () => {
    spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ statusCode: 422, error: 'Unprocessable Entity', code: 'invalid_request', message: 'Field harus diisi!', data: { field: 'full_name' } }, { status: 422 }));
    await expect(request('/admin/users', z.unknown())).rejects.toMatchObject({ field: 'full_name', message: 'Field harus diisi!' });
  });
  test('sesi kedaluwarsa pada data terlindungi memicu pembersihan sesi', async () => {
    let cleared = false; onUnauthorized(() => { cleared = true; });
    spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ statusCode: 401, error: 'Unauthorized', code: 'session_not_found', message: 'Silahkan login' }, { status: 401 }));
    await expect(request('/books', z.unknown())).rejects.toBeInstanceOf(ApiError); expect(cleared).toBe(true);
  });
  test('respons sukses yang salah bentuk ditolak di batas API', async () => {
    spyOn(globalThis, 'fetch').mockResolvedValue(Response.json({ data: { id: 1 } })); await expect(request('/example', z.object({ data: z.object({ id: z.string() }) }))).rejects.toMatchObject({ code: 'invalid_response' });
  });
  test('koneksi gagal tidak dianggap autentikasi berhasil', async () => {
    spyOn(globalThis, 'fetch').mockRejectedValue(new TypeError('Offline')); await expect(request('/auth/login', z.unknown())).rejects.toMatchObject({ code: 'network_error' });
  });
});
