import { createSignal } from 'solid-js';
import { getProfile, logout } from '../api/auth';
import { ApiError } from '../api/client';
import type { Profile } from '../api/contracts';
import { queryClient } from './query';

export const [currentUser, setCurrentUser] = createSignal<Profile | null>(null);
const reminderKey = 'readonly:login-reminders';
// AC-10.04–AC-10.07: penanda ini hanya untuk popup, bukan bukti autentikasi.
export function beginLogin(user: Profile) {
  queryClient.clear();
  setCurrentUser(user);
  if (user.role === 'member') sessionStorage.setItem(reminderKey, user.id);
}
export const hasLoginReminders = () =>
  sessionStorage.getItem(reminderKey) === currentUser()?.id;
export const consumeLoginReminders = () =>
  sessionStorage.removeItem(reminderKey);
export function clearSession() {
  setCurrentUser(null);
  consumeLoginReminders();
  queryClient.clear();
}
export async function loadSession() {
  try {
    const user = await getProfile();
    setCurrentUser(user);
    return user;
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      clearSession();
      return null;
    }
    throw error;
  }
}
// AC-03.01: navigasi keluar dilakukan setelah server mengakhiri sesi.
export async function endSession() {
  try {
    await logout();
  } catch (error) {
    if (!(error instanceof ApiError && error.status === 401)) throw error;
  }
  clearSession();
}
