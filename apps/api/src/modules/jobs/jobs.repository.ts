import { type Database, jobRuns } from '@readonly/db';
import type { JobName } from '@readonly/shared';
import { and, desc, eq, isNotNull, sql } from 'drizzle-orm';

export interface JobRunRecord {
  id: string;
  jobName: JobName;
  startedAt: Date;
  finishedAt: Date | null;
  rowsAffected: number | null;
}

export interface JobsRepository {
  createJobRun(jobName: JobName, startedAt: Date): Promise<string>;
  finishJobRun(
    id: string,
    finishedAt: Date,
    rowsAffected: number,
  ): Promise<void>;
  getLastSuccessfulRun(jobName: JobName): Promise<JobRunRecord | null>;
  executeWithAdvisoryLock<T>(
    lockKey: string,
    action: () => Promise<T>,
  ): Promise<T>;
}

export class DrizzleJobsRepository implements JobsRepository {
  constructor(private readonly db: Database) {}

  async createJobRun(jobName: JobName, startedAt: Date): Promise<string> {
    const [row] = await this.db
      .insert(jobRuns)
      .values({
        jobName,
        startedAt,
      })
      .returning({ id: jobRuns.id });
    return row.id;
  }

  async finishJobRun(
    id: string,
    finishedAt: Date,
    rowsAffected: number,
  ): Promise<void> {
    await this.db
      .update(jobRuns)
      .set({
        finishedAt,
        rowsAffected,
      })
      .where(eq(jobRuns.id, id));
  }

  async getLastSuccessfulRun(jobName: JobName): Promise<JobRunRecord | null> {
    const [row] = await this.db
      .select({
        id: jobRuns.id,
        jobName: jobRuns.jobName,
        startedAt: jobRuns.startedAt,
        finishedAt: jobRuns.finishedAt,
        rowsAffected: jobRuns.rowsAffected,
      })
      .from(jobRuns)
      .where(and(eq(jobRuns.jobName, jobName), isNotNull(jobRuns.finishedAt)))
      .orderBy(desc(jobRuns.startedAt))
      .limit(1);

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      jobName: row.jobName,
      startedAt: row.startedAt,
      finishedAt: row.finishedAt,
      rowsAffected: row.rowsAffected,
    };
  }

  async executeWithAdvisoryLock<T>(
    lockKey: string,
    action: () => Promise<T>,
  ): Promise<T> {
    return await this.db.transaction(async (tx) => {
      await tx.execute(sql`SELECT pg_advisory_xact_lock(hashtext(${lockKey}))`);
      return await action();
    });
  }
}

export class InMemoryJobsRepository implements JobsRepository {
  private readonly runs: JobRunRecord[] = [];
  private readonly activeLocks = new Set<string>();

  async createJobRun(jobName: JobName, startedAt: Date): Promise<string> {
    const id = crypto.randomUUID();
    this.runs.push({
      id,
      jobName,
      startedAt,
      finishedAt: null,
      rowsAffected: null,
    });
    return id;
  }

  async finishJobRun(
    id: string,
    finishedAt: Date,
    rowsAffected: number,
  ): Promise<void> {
    const run = this.runs.find((r) => r.id === id);
    if (run) {
      run.finishedAt = finishedAt;
      run.rowsAffected = rowsAffected;
    }
  }

  async getLastSuccessfulRun(jobName: JobName): Promise<JobRunRecord | null> {
    const successful = this.runs
      .filter((r) => r.jobName === jobName && r.finishedAt !== null)
      .sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());

    const latest = successful[0];
    if (!latest) {
      return null;
    }

    return {
      id: latest.id,
      jobName: latest.jobName,
      startedAt: latest.startedAt,
      finishedAt: latest.finishedAt,
      rowsAffected: latest.rowsAffected,
    };
  }

  async executeWithAdvisoryLock<T>(
    lockKey: string,
    action: () => Promise<T>,
  ): Promise<T> {
    this.activeLocks.add(lockKey);
    try {
      return await action();
    } finally {
      this.activeLocks.delete(lockKey);
    }
  }

  getRuns(): JobRunRecord[] {
    return [...this.runs];
  }

  isLockActive(lockKey: string): boolean {
    return this.activeLocks.has(lockKey);
  }
}
