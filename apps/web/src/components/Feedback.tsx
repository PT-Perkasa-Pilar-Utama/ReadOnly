import { createSignal, Show } from 'solid-js';
import Icon from './Icon';

const [notice, setNotice] = createSignal<{
  message: string;
  kind: 'success' | 'error';
} | null>(null);
let timeout: ReturnType<typeof setTimeout> | undefined;
export function notify(message: string, kind: 'success' | 'error' = 'success') {
  clearTimeout(timeout);
  setNotice({ message, kind });
  timeout = setTimeout(() => setNotice(null), 5000);
}
export function ToastRegion() {
  return (
    <div class="toast-region" aria-live="polite" aria-atomic="true">
      <Show when={notice()}>
        {(item) => (
          <div class={`toast ${item().kind}`}>
            <span class="toast-icon">
              <Icon
                name={item().kind === 'success' ? 'check' : 'warning'}
                size={18}
              />
            </span>
            <span>{item().message}</span>
            <button
              class="icon-button"
              type="button"
              aria-label="Tutup pesan"
              onClick={() => setNotice(null)}
            >
              <Icon name="close" size={16} />
            </button>
          </div>
        )}
      </Show>
    </div>
  );
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
