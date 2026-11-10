import { apiErrorEnvelopeSchema, type Pagination } from '@readonly/shared';
import type { z } from 'zod';

const API_BASE_PATH = '/api/v1';

// Mode demo tetap mengikuti fasilitas yang sudah tersedia pada branch dev.
// API khusus Admin di bawah selalu menggunakan backend melalui apiRequest.
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

export class ApiRequestError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly data: unknown;

  constructor(
    statusCode: number,
    code: string,
    message: string,
    data?: unknown,
  ) {
    super(message);
    this.name = 'ApiRequestError';
    this.statusCode = statusCode;
    this.code = code;
    this.data = data;
  }
}

// AC-02.02, AC-02.03, AC-12.07, AC-12.10: kode stabil menentukan copy resmi FE.
const errorMessages: Record<string, string> = {
  invalid_credentials: 'email and Password tidak sama',
  user_not_found: 'Email Not Registered',
  account_inactive: 'Akun Anda tidak aktif. Silakan hubungi Admin Perpus.',
  account_has_active_loans:
    'Akun tidak dapat dinonaktifkan karena masih memiliki peminjaman aktif',
};

let unauthorizedHandler = () => {};

export function onUnauthorized(handler: () => void) {
  unauthorizedHandler = handler;
}

export interface ApiSuccessResponse<T> {
  data: T;
  message?: string;
  pagination?: Pagination;
  authors?: string[];
}

type ApiErrorEnvelope = {
  statusCode?: number;
  code?: string;
  message?: string;
  data?: unknown;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toApiErrorEnvelope(value: unknown): ApiErrorEnvelope {
  if (!isRecord(value)) {
    return {};
  }

  return {
    ...(typeof value.statusCode === 'number'
      ? { statusCode: value.statusCode }
      : {}),
    ...(typeof value.code === 'string' ? { code: value.code } : {}),
    ...(typeof value.message === 'string' ? { message: value.message } : {}),
    ...('data' in value ? { data: value.data } : {}),
  };
}

function toPagination(value: unknown): Pagination | undefined {
  if (!isRecord(value)) {
    return undefined;
  }

  const { page, limit, total, totalPages } = value;
  if (
    typeof page !== 'number' ||
    typeof limit !== 'number' ||
    typeof total !== 'number' ||
    typeof totalPages !== 'number'
  ) {
    return undefined;
  }

  return { page, limit, total, totalPages };
}

// Request API untuk halaman Admin US-04, US-05, dan US-06.
async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<ApiSuccessResponse<T>> {
  const headers = new Headers(init.headers);
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_PATH}${path}`, {
      ...init,
      credentials: 'include',
      headers,
    });
  } catch (error) {
    if (init.signal?.aborted) {
      throw error;
    }
    throw new ApiRequestError(
      0,
      'network_error',
      'Tidak dapat terhubung ke server. Silakan coba lagi.',
    );
  }

  const payload: unknown = await response.json().catch(() => undefined);

  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('/auth/')) {
      unauthorizedHandler();
    }

    const parsedError = apiErrorEnvelopeSchema.safeParse(payload);
    if (parsedError.success) {
      throw new ApiRequestError(
        parsedError.data.statusCode,
        parsedError.data.code,
        parsedError.data.message,
        parsedError.data.data,
      );
    }

    const error = toApiErrorEnvelope(payload);
    throw new ApiRequestError(
      error.statusCode ?? response.status,
      error.code ?? 'request_failed',
      error.message ??
        error.code ??
        'Layanan belum dapat memproses permintaan. Silakan coba lagi.',
      error.data,
    );
  }

  if (!isRecord(payload) || !('data' in payload)) {
    throw new ApiRequestError(
      response.status,
      'invalid_response',
      'Respons server tidak sesuai. Silakan coba lagi.',
    );
  }

  const pagination = toPagination(payload.pagination);

  return {
    data: payload.data as T,
    ...(typeof payload.message === 'string'
      ? { message: payload.message }
      : {}),
    ...(pagination ? { pagination } : {}),
    ...(Array.isArray(payload.authors) &&
    payload.authors.every((author) => typeof author === 'string')
      ? { authors: payload.authors }
      : {}),
  };
}

// Request API berbasis Zod dari branch dev untuk katalog, auth, dan user.
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
      ) {
        unauthorizedHandler();
      }
      throw error;
    }
  } else {
    let response: Response;
    try {
      response = await fetch(`${API_BASE_PATH}${path}`, {
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
      if (response.status === 401 && !path.startsWith('/auth/')) {
        unauthorizedHandler();
      }
      if (error.success) {
        throw new ApiError(
          response.status,
          error.data.code,
          errorMessages[error.data.code] ?? error.data.message,
          typeof error.data.data?.field === 'string'
            ? error.data.data.field
            : undefined,
        );
      }
      throw new ApiError(
        response.status,
        'service_error',
        'Layanan belum dapat memproses permintaan. Silakan coba lagi.',
      );
    }
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(
      502,
      'invalid_response',
      'Respons server tidak sesuai. Silakan coba lagi.',
    );
  }

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
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== '') {
      query.set(key, String(value));
    }
  }
  return query.toString();
}

export async function apiGetResponse<T>(
  path: string,
  signal?: AbortSignal,
): Promise<ApiSuccessResponse<T>> {
  return apiRequest<T>(path, {
    method: 'GET',
    ...(signal ? { signal } : {}),
  });
}

export async function apiGet<T>(
  path: string,
  signal?: AbortSignal,
): Promise<T> {
  const response = await apiGetResponse<T>(path, signal);
  return response.data;
}

export async function apiPostForm<T>(
  path: string,
  body: FormData,
): Promise<ApiSuccessResponse<T>> {
  return apiRequest<T>(path, {
    method: 'POST',
    body,
  });
}

export async function apiPatchForm<T>(
  path: string,
  body: FormData,
): Promise<ApiSuccessResponse<T>> {
  return apiRequest<T>(path, {
    method: 'PATCH',
    body,
  });
}

export async function apiDelete<T>(
  path: string,
): Promise<ApiSuccessResponse<T>> {
  return apiRequest<T>(path, {
    method: 'DELETE',
  });
}
