import { describe, expect, test } from 'bun:test';
import { createApp } from './app';

const healthyChecks = {
  database: async () => true,
  storage: async () => true,
};

describe('system API', () => {
  test('returns dependency health without changing the HTTP success status', async () => {
    const app = createApp(healthyChecks);
    const response = await app.handle(
      new Request('http://localhost/api/v1/health'),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: {
        api: 'ok',
        db: 'ok',
        storage: 'ok',
      },
    });
  });

  test('reports unavailable dependencies as errors while keeping health operational', async () => {
    const app = createApp({
      database: async () => false,
      storage: async () => {
        throw new Error('storage probe failed');
      },
    });
    const response = await app.handle(
      new Request('http://localhost/api/v1/health'),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      data: {
        api: 'ok',
        db: 'error',
        storage: 'error',
      },
    });
  });

  test('returns the standard error envelope for unknown routes', async () => {
    const app = createApp(healthyChecks);
    const response = await app.handle(
      new Request('http://localhost/api/v1/missing'),
    );

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      statusCode: 404,
      error: 'Not Found',
      code: 'not_found',
      message: 'Resource tidak ditemukan.',
    });
  });
});
