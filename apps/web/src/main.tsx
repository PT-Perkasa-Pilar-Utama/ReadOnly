import { QueryClient, QueryClientProvider } from '@tanstack/solid-query';
import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  RouterProvider,
} from '@tanstack/solid-router';
import { render } from 'solid-js/web';

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => <main />,
});

const router = createRouter({
  routeTree: rootRoute.addChildren([indexRoute]),
});

const queryClient = new QueryClient();
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
