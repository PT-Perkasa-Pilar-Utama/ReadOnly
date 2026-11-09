import { request } from './client';
import { notificationsSchema } from './contracts';

export const getNotifications = (page = 1) =>
  request(`/notifications?page=${page}&limit=10`, notificationsSchema);
