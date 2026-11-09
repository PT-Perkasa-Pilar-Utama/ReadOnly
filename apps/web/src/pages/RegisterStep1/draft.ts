import type { Registration } from '@web/api/contracts';
import { createSignal } from 'solid-js';

export const emptyRegistration = (): Registration => ({
  full_name: '',
  email: '',
  address: '',
  phone_number: '',
  password: '',
  confirm_password: '',
});
// AC-01.07: password antar-langkah hanya berada di memori, bukan URL/storage.
export const [registrationDraft, setRegistrationDraft] =
  createSignal<Registration | null>(null);
export const clearRegistration = () => setRegistrationDraft(null);
