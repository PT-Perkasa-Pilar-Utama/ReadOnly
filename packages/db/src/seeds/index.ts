import { createDatabaseClient, type Database } from '../client';
import { seedDev } from './dev';
import {
  QA_EXPECTED_DASHBOARD_SUMMARY,
  type QaExpectedDashboardSummary,
  seedQa,
} from './qa';
import {
  addDaysWibDateString,
  clearAllTables,
  formatIndonesianDate,
  hashPassword,
  QA_IDS,
  QA_PENDING_QR_TOKEN,
  type SeedClock,
  type SeedCounts,
  type SeedOptions,
  sha256Hex,
} from './shared';

export type SeedMode = 'dev' | 'qa';

export async function runSeed(
  db: Database,
  mode: SeedMode = 'dev',
  options: SeedOptions = {},
): Promise<SeedCounts> {
  if (mode === 'qa') {
    return seedQa(db, options);
  }

  return seedDev(db, options);
}

export {
  addDaysWibDateString,
  clearAllTables,
  formatIndonesianDate,
  hashPassword,
  QA_EXPECTED_DASHBOARD_SUMMARY,
  QA_IDS,
  QA_PENDING_QR_TOKEN,
  type QaExpectedDashboardSummary,
  type SeedClock,
  type SeedCounts,
  type SeedOptions,
  seedDev,
  seedQa,
  sha256Hex,
};

if (import.meta.main) {
  const args = process.argv.slice(2);
  const envArgIndex = args.indexOf('--env');
  const rawMode =
    envArgIndex !== -1
      ? args[envArgIndex + 1]
      : (process.env.RESET_STATE_SEED ?? 'dev');
  const mode: SeedMode = rawMode === 'qa' ? 'qa' : 'dev';

  const { db, close } = createDatabaseClient();
  try {
    const counts = await runSeed(db, mode);
    console.info(`Database seeded (${mode}):`, counts);
  } finally {
    await close();
  }
}
