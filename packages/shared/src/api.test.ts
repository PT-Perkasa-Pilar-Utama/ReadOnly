import { describe, expect, test } from 'bun:test';
import { apiErrorEnvelopeSchema, paginationSchema } from './api';

describe('shared API contracts', () => {
  test('accepts the standard API error envelope', () => {
    expect(
      apiErrorEnvelopeSchema.safeParse({
        statusCode: 422,
        error: 'Unprocessable Entity',
        code: 'invalid_request',
        message: 'Permintaan tidak valid.',
      }).success,
    ).toBe(true);
  });

  test('rejects pagination limits above the API maximum', () => {
    expect(
      paginationSchema.safeParse({
        page: 1,
        limit: 51,
        total: 51,
        totalPages: 1,
      }).success,
    ).toBe(false);
  });
});
