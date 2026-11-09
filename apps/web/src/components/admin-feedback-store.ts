import { createSignal } from 'solid-js';

export type AdminFeedbackType = 'success' | 'error' | 'confirm';

export interface AdminFeedbackMessage {
  id: number;
  type: AdminFeedbackType;
  title: string;
  message: string;
}

let nextFeedbackId = 1;
let resolveConfirmation: ((confirmed: boolean) => void) | null = null;
const [feedback, setFeedback] = createSignal<AdminFeedbackMessage | null>(null);

export function getAdminFeedback() {
  return feedback;
}

function createFeedback(
  message: string,
  type: AdminFeedbackType,
  title: string,
): AdminFeedbackMessage | null {
  const normalizedMessage = message.trim();
  if (!normalizedMessage) return null;

  const notice: AdminFeedbackMessage = {
    id: nextFeedbackId,
    type,
    title,
    message: normalizedMessage,
  };
  nextFeedbackId += 1;
  return notice;
}

export function showAdminFeedback(
  message: string,
  type: Exclude<AdminFeedbackType, 'confirm'> = 'success',
): void {
  const title = type === 'success' ? 'Berhasil' : 'Perhatian';
  const notice = createFeedback(message, type, title);
  if (!notice) return;

  if (resolveConfirmation) {
    resolveConfirmation(false);
    resolveConfirmation = null;
  }

  setFeedback(notice);
}

export function requestAdminConfirmation(message: string): Promise<boolean> {
  const notice = createFeedback(message, 'confirm', 'Konfirmasi');
  if (!notice) return Promise.resolve(false);

  if (resolveConfirmation) {
    resolveConfirmation(false);
    resolveConfirmation = null;
  }

  setFeedback(notice);
  return new Promise((resolve) => {
    resolveConfirmation = resolve;
  });
}

export function confirmAdminFeedback(): void {
  const resolve = resolveConfirmation;
  resolveConfirmation = null;
  setFeedback(null);
  resolve?.(true);
}

export function dismissAdminFeedback(): void {
  const resolve = resolveConfirmation;
  resolveConfirmation = null;
  setFeedback(null);
  resolve?.(false);
}
