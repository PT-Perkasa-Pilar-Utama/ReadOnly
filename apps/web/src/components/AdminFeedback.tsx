import { Show } from 'solid-js';
import {
  confirmAdminFeedback,
  dismissAdminFeedback,
  getAdminFeedback,
} from './admin-feedback-store';
import './AdminFeedback.css';

export function AdminFeedback() {
  const feedback = getAdminFeedback();

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      dismissAdminFeedback();
      return;
    }

    if (event.key === 'Tab') {
      const target = event.currentTarget;
      if (!(target instanceof HTMLElement)) return;

      const focusable = Array.from(
        target.querySelectorAll<HTMLButtonElement>('button:not(:disabled)'),
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  }

  return (
    <Show when={feedback()}>
      {(notice) => (
        <div class="admin-feedback-backdrop">
          <Show when={notice().type === 'error'}>
            <div
              class={`admin-feedback-modal admin-feedback-modal--${notice().type}`}
              role="alertdialog"
              aria-modal="true"
              aria-labelledby="admin-feedback-title"
              aria-describedby="admin-feedback-message"
              data-feedback-id={notice().id}
              tabindex="-1"
              onKeyDown={handleKeyDown}
            >
              <div class="admin-feedback-modal__content">
                <span class="admin-feedback-modal__icon" aria-hidden="true">
                  !
                </span>

                <div class="admin-feedback-modal__copy">
                  <h2 id="admin-feedback-title">{notice().title}</h2>
                  <p id="admin-feedback-message">{notice().message}</p>
                </div>
              </div>

              <div class="admin-feedback-modal__actions">
                <Show when={notice().type === 'confirm'}>
                  <button
                    class="admin-feedback-modal__button admin-feedback-modal__button--secondary"
                    type="button"
                    onClick={dismissAdminFeedback}
                  >
                    Batal
                  </button>
                </Show>

                <button
                  class="admin-feedback-modal__button admin-feedback-modal__button--primary"
                  type="button"
                  ref={(element) => element.focus()}
                  onClick={() =>
                    notice().type === 'confirm'
                      ? confirmAdminFeedback()
                      : dismissAdminFeedback()
                  }
                >
                  OK
                </button>
              </div>
            </div>
          </Show>

          <Show when={notice().type !== 'error'}>
            <div
              class={`admin-feedback-modal admin-feedback-modal--${notice().type}`}
              role="dialog"
              aria-modal="true"
              aria-labelledby="admin-feedback-title"
              aria-describedby="admin-feedback-message"
              data-feedback-id={notice().id}
              tabindex="-1"
              onKeyDown={handleKeyDown}
            >
              <div class="admin-feedback-modal__content">
                <span class="admin-feedback-modal__icon" aria-hidden="true">
                  {notice().type === 'success' ? '✓' : '!'}
                </span>

                <div class="admin-feedback-modal__copy">
                  <h2 id="admin-feedback-title">{notice().title}</h2>
                  <p id="admin-feedback-message">{notice().message}</p>
                </div>
              </div>

              <div class="admin-feedback-modal__actions">
                <Show when={notice().type === 'confirm'}>
                  <button
                    class="admin-feedback-modal__button admin-feedback-modal__button--secondary"
                    type="button"
                    onClick={dismissAdminFeedback}
                  >
                    Batal
                  </button>
                </Show>

                <button
                  class="admin-feedback-modal__button admin-feedback-modal__button--primary"
                  type="button"
                  ref={(element) => element.focus()}
                  onClick={() =>
                    notice().type === 'confirm'
                      ? confirmAdminFeedback()
                      : dismissAdminFeedback()
                  }
                >
                  OK
                </button>
              </div>
            </div>
          </Show>
        </div>
      )}
    </Show>
  );
}
