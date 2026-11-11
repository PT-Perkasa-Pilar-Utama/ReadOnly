import { Show } from 'solid-js';
import { showAdminFeedback } from './admin-feedback-store';
import Icon from './Icon';

export function notify(message: string, kind: 'success' | 'error' = 'success') {
  showAdminFeedback(message, kind);
}

// Notifications are rendered by the shared centered feedback dialog so every
// success/error message follows the same Figma pattern on every route.
export function ToastRegion() {
  return null;
}
export function ErrorNotice(props: { error: unknown; retry?: () => void }) {
  return (
    <div class="error-notice" role="alert">
      <Icon name="warning" />
      <div>
        <p>
          {props.error instanceof Error
            ? props.error.message
            : 'Terjadi kesalahan. Silakan coba lagi.'}
        </p>
        <Show when={props.retry}>
          <button type="button" class="text-button" onClick={props.retry}>
            Coba lagi
          </button>
        </Show>
      </div>
    </div>
  );
}
export function Loading(props: { label?: string }) {
  return (
    <div class="loading-state" role="status">
      <span class="spinner" />
      {props.label ?? 'Memuat data…'}
    </div>
  );
}
