import { z } from 'zod';
import { json, queryString, request } from './client';
import {
  type AdminInput,
  envelope,
  type UserEdit,
  userDetailSchema,
  userListSchema,
  userSchema,
} from './contracts';

// AC-12.01, AC-12.11: pencarian/filter tidak terbatas pada halaman tabel yang terlihat.
export const getUsers = (
  filters: { q: string; role: string; page: number },
  signal?: AbortSignal,
) =>
  request(
    `/admin/users?${queryString({ ...filters, limit: 10 })}`,
    userListSchema,
    signal ? { signal } : {},
  );
export const getUser = async (id: string) =>
  (
    await request(
      `/admin/users/${encodeURIComponent(id)}`,
      envelope(userDetailSchema),
    )
  ).data;
export const addAdmin = (input: AdminInput) =>
  request('/admin/users', envelope(userSchema), json('POST', input));
export const editUser = (id: string, input: UserEdit) =>
  request(
    `/admin/users/${encodeURIComponent(id)}`,
    envelope(z.object({ id: z.string() })),
    json('PATCH', input),
  );
export const setUserStatus = (id: string, status: 'active' | 'inactive') =>
  request(
    `/admin/users/${encodeURIComponent(id)}/status`,
    envelope(
      z.object({ id: z.string(), status: z.enum(['active', 'inactive']) }),
    ),
    json('PATCH', { status }),
  );
