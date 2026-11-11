import { UUID_REGEX } from '@readonly/shared';
import { Elysia } from 'elysia';
import { createNotFoundError, fromZodError } from '../../shared/errors';
import { requireRole } from '../auth/auth.routes';
import type { AuthService } from '../auth/auth.service';
import {
  adminLoansQuerySchema,
  createLoanInputSchema,
  myLoansQuerySchema,
} from './loans.schema';
import type { LoansService } from './loans.service';

export function createLoansRoutes(
  loansService: LoansService,
  authService?: AuthService,
) {
  return new Elysia()
    .post('/loans', async ({ body, request, set }) => {
      let userId: string;
      if (authService) {
        const session = await requireRole(request, authService, 'member');
        userId = session.user.id;
      } else {
        userId = request.headers.get('x-user-id') ?? '';
      }

      const parsed = createLoanInputSchema.safeParse(body);
      if (!parsed.success) {
        throw fromZodError(parsed.error);
      }

      const result = await loansService.createLoan(userId, parsed.data);
      set.status = 201;
      return result;
    })
    .get('/loans/me', async ({ query, request }) => {
      let userId: string;
      if (authService) {
        const session = await requireRole(request, authService, 'member');
        userId = session.user.id;
      } else {
        userId = request.headers.get('x-user-id') ?? '';
      }

      const parsed = myLoansQuerySchema.safeParse(query);
      if (!parsed.success) {
        throw fromZodError(parsed.error);
      }

      return loansService.listMyLoans(userId, parsed.data);
    })
    .get('/loans/:id/qr', async ({ params: { id }, request }) => {
      let userId: string;
      if (authService) {
        const session = await requireRole(request, authService, 'member');
        userId = session.user.id;
      } else {
        userId = request.headers.get('x-user-id') ?? '';
      }

      if (!UUID_REGEX.test(id)) {
        throw createNotFoundError('Peminjaman tidak ditemukan.');
      }

      return loansService.getLoanQr(userId, id);
    })
    .get('/admin/loans', async ({ query, request }) => {
      if (authService) {
        await requireRole(request, authService, 'admin');
      }

      const parsed = adminLoansQuerySchema.safeParse(query);
      if (!parsed.success) {
        throw fromZodError(parsed.error);
      }

      return loansService.listAdminLoans(parsed.data);
    })
    .get('/admin/loans/:id', async ({ params: { id }, request }) => {
      if (authService) {
        await requireRole(request, authService, 'admin');
      }

      if (!UUID_REGEX.test(id)) {
        throw createNotFoundError('Peminjaman tidak ditemukan.');
      }

      return loansService.getAdminLoanDetail(id);
    });
}
