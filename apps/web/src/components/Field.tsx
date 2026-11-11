import { createSignal, Show } from 'solid-js';
import Icon from './Icon';

export default function Field(props: {
  name: string;
  label: string;
  value: string;
  onInput: (value: string) => void;
  error?: string | undefined;
  type?: string;
  autocomplete?: string;
  readonly?: boolean;
  placeholder?: string;
  required?: boolean;
  multiline?: boolean;
}) {
  const [visible, setVisible] = createSignal(false);
  return (
    <div class="field">
      <label for={props.name}>
        {props.label}
        <Show when={props.required !== false && !props.readonly}>
          <span class="required-mark" aria-hidden="true">
            {' '}
            *
          </span>
        </Show>
      </label>
      <div class="input-wrap">
        <Show
          when={props.multiline}
          fallback={
            <input
              id={props.name}
              name={props.name}
              type={
                props.type === 'password' && visible()
                  ? 'text'
                  : (props.type ?? 'text')
              }
              value={props.value}
              onInput={(event) => props.onInput(event.currentTarget.value)}
              autocomplete={props.autocomplete}
              readonly={props.readonly}
              placeholder={props.placeholder}
              required={props.required !== false && !props.readonly}
              aria-invalid={Boolean(props.error)}
              aria-describedby={props.error ? `${props.name}-error` : undefined}
              classList={{ 'password-input': props.type === 'password' }}
            />
          }
        >
          <textarea
            id={props.name}
            name={props.name}
            value={props.value}
            onInput={(event) => props.onInput(event.currentTarget.value)}
            autocomplete={props.autocomplete}
            readonly={props.readonly}
            placeholder={props.placeholder}
            required={props.required !== false && !props.readonly}
            aria-invalid={Boolean(props.error)}
            aria-describedby={props.error ? `${props.name}-error` : undefined}
          />
        </Show>
        <Show when={props.type === 'password'}>
          <button
            type="button"
            class="password-toggle"
            aria-label={
              visible()
                ? `Sembunyikan ${props.label}`
                : `Tampilkan ${props.label}`
            }
            aria-pressed={visible()}
            onClick={() => setVisible(!visible())}
          >
            <Icon name="eye" size={17} />
            <Show when={!visible()}>
              <span class="eye-slash" />
            </Show>
          </button>
        </Show>
      </div>
      <Show when={props.error}>
        <span class="field-error" id={`${props.name}-error`}>
          {props.error}
        </span>
      </Show>
    </div>
  );
}
