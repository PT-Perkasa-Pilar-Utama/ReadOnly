import { beforeEach, describe, expect, test } from 'bun:test';
import { z } from 'zod';
import { ApiError, json } from '../api/client';
import {
  bookDetailSchema,
  catalogSchema,
  envelope,
  notificationsSchema,
  profileSchema,
  userDetailSchema,
  userListSchema,
} from '../api/contracts';
import { createDemoApi } from './demo-api';
import { DEMO_ADMIN, DEMO_MEMBER, DEMO_PASSWORD, makeDemoPopups } from './fixtures';

let call: ReturnType<typeof createDemoApi>;
let storage: Map<string, string>;
const account = {
  full_name: 'Pembaca Uji',
  email: 'baru@example.test',
  address: 'Alamat Uji',
  phone_number: '0800000000',
  password: 'password',
  confirm_password: 'password',
};
beforeEach(() => {
  storage = new Map();
  call = createDemoApi(
    {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => {
        storage.set(key, value);
      },
    },
    () => new Date('2026-11-09T05:00:00Z'),
  );
});
const signIn = (email = DEMO_ADMIN) =>
  call('/auth/login', json('POST', { email, password: DEMO_PASSWORD }));
describe('simulasi development mengikuti kontrak FE', () => {
  test('AC-10.05: tanggal popup mengikuti WIB ketika tanggal UTC berbeda', () => {
    const popups = makeDemoPopups(new Date('2026-11-09T18:00:00Z'));
    expect(popups.find(popup => popup.condition === 'DUE_TODAY')?.books[0]?.due_date).toBe('2026-11-10');
  });
  test('AC-01.06–08: validasi dua langkah, genre wajib, email duplikat', async () => {
    expect(
      await call('/auth/register/validate', json('POST', account)),
    ).toMatchObject({ data: { step: 2 } });
    await expect(
      call('/auth/register', json('POST', { ...account, genres: [] })),
    ).rejects.toMatchObject({ message: 'Pilih minimal 1 genre' });
    await call(
      '/auth/register',
      json('POST', { ...account, genres: ['genre-1'] }),
    );
    await expect(
      call(
        '/auth/register/validate',
        json('POST', { ...account, email: 'BARU@example.test' }),
      ),
    ).rejects.toMatchObject({ status: 409, field: 'email' });
    expect([...storage.values()].join('')).not.toContain('"password":');
    expect([...storage.values()].join('')).not.toContain('confirm_password');
  });
  test('AC-02.02–03, AC-12.07: password salah, email tak dikenal, akun nonaktif', async () => {
    await expect(
      call(
        '/auth/login',
        json('POST', { email: DEMO_MEMBER, password: 'wrong' }),
      ),
    ).rejects.toMatchObject({ message: 'email and Password tidak sama' });
    await expect(
      call(
        '/auth/login',
        json('POST', { email: 'missing@example.test', password: 'wrong' }),
      ),
    ).rejects.toMatchObject({ message: 'Email Not Registered' });
    await expect(
      call(
        '/auth/login',
        json('POST', {
          email: 'nonaktif@demo.readonly.test',
          password: DEMO_PASSWORD,
        }),
      ),
    ).rejects.toMatchObject({
      message: 'Akun Anda tidak aktif. Silakan hubungi Admin Perpus.',
    });
  });
  test('AC-02.05, AC-03.01: role, pembatasan akses, dan invalidasi sesi', async () => {
    await signIn(DEMO_MEMBER);
    expect(
      envelope(profileSchema).parse(await call('/auth/me')).data.role,
    ).toBe('member');
    await expect(call('/admin/users')).rejects.toMatchObject({ status: 403 });
    await call('/auth/logout', { method: 'POST' });
    await expect(call('/auth/me')).rejects.toMatchObject({ status: 401 });
  });
  test('AC-07.01–04: rekomendasi, pencarian/filter gabungan, halaman kedua dan detail', async () => {
    await signIn(DEMO_MEMBER);
    const first = catalogSchema.parse(await call('/books?page=1&limit=10'));
    expect(first.data).toHaveLength(10);
    expect(first.recommendations).toHaveLength(6);
    const second = catalogSchema.parse(await call('/books?page=2&limit=10'));
    expect(second.data).toHaveLength(2);
    const filtered = catalogSchema.parse(
      await call('/books?q=Surat&author=Adit%20Pranata&genre=genre-1'),
    );
    expect(filtered.data.map((book) => book.title)).toEqual([
      'Surat untuk Laut',
    ]);
    expect(
      envelope(bookDetailSchema).parse(await call('/books/book-1')).data
        .synopsis.length,
    ).toBeGreaterThan(0);
  });
  test('AC-10.01–07: notifikasi persisten dan popup terkelompok berurutan', async () => {
    await signIn(DEMO_MEMBER);
    const response = notificationsSchema.parse(await call('/notifications'));
    expect(response.login_popups.map((popup) => popup.condition)).toEqual([
      'OVERDUE',
      'DUE_TODAY',
      'DUE_SOON',
    ]);
    expect(response.login_popups[0]?.books).toHaveLength(2);
    expect(
      response.data.find((item) => item.type === 'DUE_SOON_3D')?.text,
    ).toBe(
      'Cahaya di Balik Jendela perlu dikembalikan paling lambat 12 November 2026.',
    );
    expect(
      notificationsSchema.parse(await call('/notifications')).data,
    ).toEqual(response.data);
  });
  test('AC-12.09–10: menolak nonaktifkan diri sendiri dan member dengan pinjaman aktif', async () => {
    await signIn();
    await expect(
      call(
        '/admin/users/admin-1/status',
        json('PATCH', { status: 'inactive' }),
      ),
    ).rejects.toMatchObject({ code: 'cannot_deactivate_self' });
    await expect(
      call(
        '/admin/users/member-1/status',
        json('PATCH', { status: 'inactive' }),
      ),
    ).rejects.toMatchObject({
      message:
        'Akun tidak dapat dinonaktifkan karena masih memiliki peminjaman aktif',
    });
    expect(
      envelope(userDetailSchema).parse(await call('/admin/users/member-1')).data
        .status,
    ).toBe('active');
  });
  test('AC-12.02–08: tambah admin, edit, nonaktifkan, aktifkan, dan login ulang', async () => {
    await signIn();
    const { address: _address, ...admin } = account;
    const result = envelope(userDetailSchema.omit({ address: true })).parse(
      await call('/admin/users', json('POST', admin)),
    );
    const id = result.data.id;
    expect(result.data.role).toBe('admin');
    await call(
      `/admin/users/${id}`,
      json('PATCH', { full_name: 'Admin Diubah', phone_number: '0812' }),
    );
    expect(
      envelope(userDetailSchema).parse(await call(`/admin/users/${id}`)).data
        .full_name,
    ).toBe('Admin Diubah');
    await expect(
      call(
        `/admin/users/${id}`,
        json('PATCH', {
          full_name: 'X',
          phone_number: '08',
          email: 'changed@example.test',
        }),
      ),
    ).rejects.toBeInstanceOf(ApiError);
    await call(
      `/admin/users/${id}/status`,
      json('PATCH', { status: 'inactive' }),
    );
    await expect(
      call(
        '/auth/login',
        json('POST', { email: account.email, password: account.password }),
      ),
    ).rejects.toMatchObject({ code: 'account_inactive' });
    await call(
      `/admin/users/${id}/status`,
      json('PATCH', { status: 'active' }),
    );
    await call(
      '/auth/login',
      json('POST', { email: account.email, password: account.password }),
    );
    expect(envelope(profileSchema).parse(await call('/auth/me')).data.id).toBe(
      id,
    );
    const saved = [...storage.values()].join('');
    expect(saved).not.toContain('confirm_password');
    expect(saved).not.toContain('"password":');
  });
  test('AC-12.11: paginasi dan kombinasi keyword/role mengembalikan hasil kosong yang valid', async () => {
    await signIn();
    expect(
      userListSchema.parse(await call('/admin/users?page=2&limit=10')).data,
    ).toHaveLength(3);
    expect(
      userListSchema.parse(await call('/admin/users?q=Alya&role=admin')).data,
    ).toEqual([]);
    expect(
      userListSchema.parse(await call('/admin/users?q=ALYA&role=member')).data,
    ).toHaveLength(1);
  });
  test('kontrak logout 204 tidak mengandung body', async () => {
    await signIn();
    expect(
      z.undefined().parse(await call('/auth/logout', { method: 'POST' })),
    ).toBeUndefined();
  });
});
