import { Show } from 'solid-js';
import { isDemo } from '../api/client';

export default function DemoBanner() {
  return (
    <Show when={isDemo}>
      <div class="demo-banner">
        <span class="demo-dot" />
        Mode demo <span class="demo-divider">/</span> Data simulasi untuk
        pengujian frontend. Perubahan tersimpan di tab ini.
      </div>
    </Show>
  );
}
