import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { createDatabaseClient, type Database } from './client';

const currentDir = dirname(fileURLToPath(import.meta.url));
export const MIGRATIONS_FOLDER = resolve(currentDir, '../drizzle');

export async function runMigrations(
  db: Database,
  migrationsFolder = MIGRATIONS_FOLDER,
) {
  await migrate(db, { migrationsFolder });
}

if (import.meta.main) {
  const { db, close } = createDatabaseClient();
  try {
    await runMigrations(db);
    console.info('Database migrations applied successfully.');
  } finally {
    await close();
  }
}
