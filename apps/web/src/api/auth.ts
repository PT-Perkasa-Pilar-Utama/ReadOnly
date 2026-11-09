import { z } from 'zod';
import { json, request } from './client';
import {
  envelope,
  genreSchema,
  profileSchema,
  type Registration,
} from './contracts';

// AC-01.07, AC-01.08: langkah pertama memeriksa data dan keunikan email ke API.
export const validateRegistration = (input: Registration) =>
  request(
    '/auth/register/validate',
    envelope(z.object({ step: z.literal(2) })),
    json('POST', input),
  );
export const register = (input: Registration & { genres: string[] }) =>
  request(
    '/auth/register',
    envelope(z.object({ userId: z.string(), role: z.literal('member') })),
    json('POST', input),
  );
// AC-02.01, AC-02.05: cookie sesi dikelola server; token tidak disimpan di browser.
export const login = (input: { email: string; password: string }) =>
  request(
    '/auth/login',
    z.object({ message: z.string().optional(), data: z.unknown() }),
    json('POST', input),
  );
export const getProfile = async () =>
  (await request('/auth/me', envelope(profileSchema))).data;
export const logout = () =>
  request('/auth/logout', z.undefined(), { method: 'POST' });
export const getGenres = async () =>
  (await request('/genres', envelope(z.array(genreSchema)))).data;
