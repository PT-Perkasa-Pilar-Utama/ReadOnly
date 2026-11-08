import { DEFAULT_API_PORT } from '@readonly/config';
import { createApp } from './app';

const configuredPort = Number(Bun.env.PORT ?? DEFAULT_API_PORT);

if (
  !Number.isInteger(configuredPort) ||
  configuredPort < 1 ||
  configuredPort > 65_535
) {
  throw new Error('PORT harus berupa bilangan bulat antara 1 dan 65535.');
}

const app = createApp();
app.listen({ hostname: '127.0.0.1', port: configuredPort });

console.info(
  `ReadOnly API berjalan pada http://localhost:${configuredPort}/api/v1`,
);
