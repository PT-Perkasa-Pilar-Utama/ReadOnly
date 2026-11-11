import { UUID_REGEX } from '@readonly/shared';
import { Elysia } from 'elysia';
import { createNotFoundError, fromZodError } from '../../shared/errors';
import { requireRole } from '../auth/auth.routes';
import type { AuthService } from '../auth/auth.service';
import { adminLoansQuerySchema } from './loans.schema';
import type { LoansService } from './loans.service';

export function createLoansRoutes(
  loansService: LoansService,
  authService?: AuthService,
) {
  return new Elysia()
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

