import QRCode from 'qrcode';
import { createEffect, createSignal, onCleanup, Show } from 'solid-js';

export default function LoanQrCanvas(props: { token: string }) {
  let canvas!: HTMLCanvasElement;
  const [hasError, setHasError] = createSignal(false);
  const [attempt, setAttempt] = createSignal(0);

  createEffect(() => {
    const token = props.token;
    attempt();
    let active = true;
    setHasError(false);

    void QRCode.toCanvas(canvas, token, {
      errorCorrectionLevel: 'M',
      margin: 4,
      width: 256,
      color: {
        dark: '#211b1b',
        light: '#ffffff',
      },
    }).catch(() => {
      if (active) setHasError(true);
    });

    onCleanup(() => {
      active = false;
      const context = canvas.getContext('2d');
      context?.clearRect(0, 0, canvas.width, canvas.height);
    });
  });

  return (
    <div class="loan-qr-canvas">
      <Show
        when={!hasError()}
        fallback={
          <div class="loan-qr-canvas__error" role="alert">
            <p class="loan-qr-error">QR Code gagal dibuat.</p>
            <button
              type="button"
              class="button secondary"
              onClick={() => setAttempt((current) => current + 1)}
            >
              Coba lagi
            </button>
          </div>
        }
      >
        <canvas ref={canvas} role="img" aria-label="Kode QR peminjaman" />
      </Show>
    </div>
  );
}
