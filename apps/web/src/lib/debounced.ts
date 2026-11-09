import { type Accessor, createEffect, createSignal, onCleanup } from 'solid-js';

export function debounced(value: Accessor<string>, delay = 250) {
  const [result, setResult] = createSignal(value());
  createEffect(() => {
    const next = value();
    const timeout = setTimeout(() => setResult(next), delay);
    onCleanup(() => clearTimeout(timeout));
  });
  return result;
}
