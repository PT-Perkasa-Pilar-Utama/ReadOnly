import { QueryClientProvider } from '@tanstack/solid-query';
import { RouterProvider } from '@tanstack/solid-router';
import { render } from 'solid-js/web';

import { onUnauthorized } from './api/client';
import { queryClient } from './lib/query';
import { clearSession } from './lib/session';
import { router } from './routes';
import './styles.css';

onUnauthorized(() => {
  clearSession();
  window.location.replace('/login');
});
const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Elemen root aplikasi tidak ditemukan.');
}

render(
  () => (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  ),
  rootElement,
);
