import { createUniqueId, onMount, type JSX } from 'solid-js';
import Icon from './Icon';

export default function Modal(props: {
  title: string;
  onClose: () => void;
  children: JSX.Element;
  class?: string;
}) {
  let dialog!: HTMLDialogElement;
  const titleId = createUniqueId();
  onMount(() => dialog.showModal());
  return (
    <dialog
      ref={dialog}
      class={`modal ${props.class ?? ''}`}
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        props.onClose();
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
