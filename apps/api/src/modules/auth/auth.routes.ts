import { Elysia } from 'elysia';
import { createRateLimitError } from '../../shared/errors';
import { extractClientIp, type RateLimiter } from '../../shared/rate-limit';
import type { AuthService } from './auth.service';

export function createAuthRoutes(
  authService: AuthService,
  registerRateLimiter: RateLimiter,
) {
  return new Elysia({ prefix: '/auth' })
    .post('/register/validate', async ({ body, request }) => {
      const clientIp = extractClientIp(request);
      if (!registerRateLimiter.consume(`register:${clientIp}`)) {
        throw createRateLimitError();
      }

      return authService.validateRegistrationStep1(body);
    })
    .post('/register', async ({ body, request, set }) => {
      const clientIp = extractClientIp(request);
      if (!registerRateLimiter.consume(`register:${clientIp}`)) {
        throw createRateLimitError();
      }

      const result = await authService.registerMember(body);
      set.status = 201;
      return result;
    });
}
