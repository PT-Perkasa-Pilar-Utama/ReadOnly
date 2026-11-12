import { notificationsQuerySchema } from '@readonly/shared';
import { Elysia } from 'elysia';
import { fromZodError } from '../../shared/errors';
import { requireRole } from '../auth/auth.routes';
import type { AuthService } from '../auth/auth.service';
import type { NotificationsService } from './notifications.service';

export function createNotificationsRoutes(
  notificationsService: NotificationsService,
  authService?: AuthService,
) {
  return new Elysia().get('/notifications', async ({ query, request }) => {
    let userId: string;
    if (authService) {
      const session = await requireRole(request, authService, 'member');
      userId = session.user.id;
    } else {
      userId = request.headers.get('x-user-id') ?? '';
    }

    const parsed = notificationsQuerySchema.safeParse(query);
    if (!parsed.success) {
      throw fromZodError(parsed.error);
    }

    return await notificationsService.getNotifications(userId, parsed.data);
  });
}
