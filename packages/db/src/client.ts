import { sql } from 'drizzle-orm';
import { drizzle, type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import postgres, { type Sql } from 'postgres';
import * as schema from './schema';

export type Database = PostgresJsDatabase<typeof schema>;

export interface DatabaseClient {
  db: Database;
  client: Sql;
  ping: () => Promise<boolean>;
  close: () => Promise<void>;
}

export function createDatabaseClient(
  connectionString?: string,
): DatabaseClient {
  const url = connectionString ?? process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL environment variable is required.');
  }

  const client = postgres(url, {
    max: 10,
    onnotice: () => {},
  });

  const db = drizzle(client, { schema });

  return {
    db,
    client,
    async ping() {
      try {
        await db.execute(sql`SELECT 1`);
        return true;
      } catch {
        return false;
      }
    },
    async close() {
      await client.end({ timeout: 5 });
    },
  };
}
