import type { ApiSuccessEnvelope } from '@readonly/shared';
import { Elysia } from 'elysia';
import { requireRole } from '../auth/auth.routes';
import type { AuthService } from '../auth/auth.service';
import type { DashboardSummary } from './dashboard.repository';
import type { DashboardService } from './dashboard.service';

export function createDashboardRoutes(
  dashboardService: DashboardService,
  authService?: AuthService,
) {
  return new Elysia().get(
    '/admin/dashboard/summary',
    async ({ request }): Promise<ApiSuccessEnvelope<DashboardSummary>> => {
      if (authService) {
        await requireRole(request, authService, 'admin');
      }

      const summary = await dashboardService.getSummary();
      return {
        data: summary,
        message: 'ok',
      };
    },
  );
}

