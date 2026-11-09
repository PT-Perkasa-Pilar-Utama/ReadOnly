import { apiErrorEnvelopeSchema } from '@readonly/shared';
import type { z } from 'zod';

export const isDemo =
  import.meta.env?.DEV === true && import.meta.env.MODE === 'demo';
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly field?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
// AC-02.02, AC-02.03, AC-12.07, AC-12.10: kode stabil menentukan copy resmi FE.
const errorMessages: Record<string, string> = {
  invalid_credentials: 'email and Password tidak sama',
  user_not_found: 'Email Not Registered',
  account_inactive: 'Akun Anda tidak aktif. Silakan hubungi Admin Perpus.',
  account_has_active_loans: 'Akun tidak dapat dinonaktifkan karena masih memiliki peminjaman aktif',
};
let unauthorizedHandler = () => {};
export function onUnauthorized(handler: () => void) {
  unauthorizedHandler = handler;
}

export async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  options: RequestInit = {},
): Promise<T> {
  let body: unknown;
  if (isDemo) {
    const { demoRequest } = await import('../dev/demo-api');
    try {
      body = await demoRequest(path, options);
    } catch (error) {
      if (
        error instanceof ApiError &&
        error.status === 401 &&
        !path.startsWith('/auth/')
      )
        unauthorizedHandler();
      throw error;
    }
  } else {
    let response: Response;
    try {
      response = await fetch(`/api/v1${path}`, {
        ...options,
        credentials: 'include',
        headers: {
          ...(options.body ? { 'Content-Type': 'application/json' } : {}),
          ...options.headers,
        },
      });
    } catch {
      throw new ApiError(
        0,
        'network_error',
        'Tidak dapat terhubung ke server. Silakan coba lagi.',
      );
    }
    body =
      response.status === 204
        ? undefined
        : await response.json().catch(() => null);
    if (!response.ok) {
      const error = apiErrorEnvelopeSchema.safeParse(body);
      if (response.status === 401 && !path.startsWith('/auth/'))
        unauthorizedHandler();
      if (error.success)
        throw new ApiError(
          response.status,
          error.data.code,
          errorMessages[error.data.code] ?? error.data.message,
          typeof error.data.data?.field === 'string'
            ? error.data.data.field
            : undefined,
        );
      throw new ApiError(
        response.status,
        'service_error',
        'Layanan belum dapat memproses permintaan. Silakan coba lagi.',
      );
    }
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    throw new ApiError(
      502,
      'invalid_response',
      'Respons server tidak sesuai. Silakan coba lagi.',
    );
  return parsed.data;
}
export const json = (method: string, body: unknown): RequestInit => ({
  method,
  body: JSON.stringify(body),
});
export function queryString(
  values: Record<string, string | number | boolean | undefined>,
) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values))
    if (value !== undefined && value !== '') query.set(key, String(value));
  return query.toString();
}
