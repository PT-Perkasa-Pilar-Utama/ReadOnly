import { createUniqueId, type JSX, onCleanup, onMount, Show } from 'solid-js';
import Icon from './Icon';

export default function Modal(props: {
  title: string;
  onClose: () => void;
  children: JSX.Element;
  class?: string;
  warning?: boolean;
}) {
  let dialog!: HTMLDialogElement;
  const titleId = createUniqueId();
  onMount(() => {
    const previousFocus = document.activeElement;
    dialog.showModal();
    onCleanup(() => {
      dialog.close();
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected)
        previousFocus.focus({ preventScroll: true });
    });
  });
  return (
    <dialog
      ref={dialog}
      class={`modal ${props.class ?? ''}`}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        props.onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          props.onClose();
        }
      }}
      onClick={(event) => {
        if (event.target === dialog) {
          const bounds = dialog.getBoundingClientRect();
          if (
            event.clientX < bounds.left ||
            event.clientX > bounds.right ||
            event.clientY < bounds.top ||
            event.clientY > bounds.bottom
          )
            props.onClose();
        }
      }}
    >
      <div class="modal-header">
        <Show when={props.warning}>
          {/* AC-12.06: ikon memperjelas peringatan sebelum akun dinonaktifkan. */}
          <span class="modal-warning" aria-hidden="true">
            <Icon name="warning" size={25} />
          </span>
        </Show>
        <h2 id={titleId}>{props.title}</h2>
        <button
          type="button"
          class="icon-button"
          aria-label="Tutup"
          onClick={props.onClose}
        >
          <Icon name="close" />
        </button>
      </div>
      {props.children}
    </dialog>
  );
}
