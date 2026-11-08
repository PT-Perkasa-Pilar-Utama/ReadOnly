import { Elysia } from 'elysia';

export interface HealthChecks {
  database: () => Promise<boolean>;
  storage: () => Promise<boolean>;
}

const unavailableHealthChecks: HealthChecks = {
  database: async () => false,
  storage: async () => false,
};

async function checkDependency(
  check: () => Promise<boolean>,
): Promise<'ok' | 'error'> {
  try {
    return (await check()) ? 'ok' : 'error';
  } catch {
    return 'error';
  }
}

export function createSystemRoutes(
  healthChecks: HealthChecks = unavailableHealthChecks,
) {
  return new Elysia().get('/health', async () => {
    const [db, storage] = await Promise.all([
      checkDependency(healthChecks.database),
      checkDependency(healthChecks.storage),
    ]);

    return {
      data: {
        api: 'ok' as const,
        db,
        storage,
      },
    };
  });
}
