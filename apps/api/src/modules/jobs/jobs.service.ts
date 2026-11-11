import {
  calculateFine,
  calculateNextWibRunDelayMs,
  getWibDateString,
  getWibDaysDifference,
  isSameWibDay,
  type JobName,
} from '@readonly/shared';
import { type ClockPort, SystemClock } from '../../ports/clock';
import type { LoansRepository } from '../loans/loans.repository';
import type { LoansService } from '../loans/loans.service';
import type { JobsRepository } from './jobs.repository';
import type { RunJobData } from './jobs.schema';

export interface JobsServiceOptions {
  repository: JobsRepository;
  loansRepository: LoansRepository;
  loansService?: LoansService | undefined;
  clock?: ClockPort | undefined;
  autoCatchUp?: boolean | undefined;
}

export class JobsService {
  private readonly repository: JobsRepository;
  private readonly loansRepository: LoansRepository;
  private readonly loansService: LoansService | undefined;
  private readonly clock: ClockPort;
  private schedulerTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(options: JobsServiceOptions) {
    this.repository = options.repository;
    this.loansRepository = options.loansRepository;
    this.loansService = options.loansService;
    this.clock = options.clock ?? new SystemClock();

    if (options.autoCatchUp) {
      void this.catchUp().catch((err) => {
        console.error('Failed to run startup catch-up job:', err);
      });
    }
  }

  getClock(): ClockPort {
    return this.clock;
  }

  getRepository(): JobsRepository {
    return this.repository;
  }

  async runStatusOverdueJob(options?: {
    clock?: ClockPort | undefined;
    force?: boolean | undefined;
  }): Promise<RunJobData> {
    const activeClock = options?.clock ?? this.clock;
    const now = activeClock.now();
    const todayWib = getWibDateString(now);

    if (!options?.force) {
      const lastRun =
        await this.repository.getLastSuccessfulRun('status_overdue');
      if (lastRun?.finishedAt && isSameWibDay(lastRun.startedAt, now)) {
        return {
          job: 'status_overdue',
          rows_affected: 0,
          started_at: now.toISOString(),
          finished_at: now.toISOString(),
          skipped: true,
        };
      }
    }

    return await this.repository.executeWithAdvisoryLock(
      'loan_overdue_job',
      async () => {
        if (!options?.force) {
          const lastRun =
            await this.repository.getLastSuccessfulRun('status_overdue');
          if (lastRun?.finishedAt && isSameWibDay(lastRun.startedAt, now)) {
            return {
              job: 'status_overdue',
              rows_affected: 0,
              started_at: now.toISOString(),
              finished_at: now.toISOString(),
              skipped: true,
            };
          }
        }

        const runId = await this.repository.createJobRun('status_overdue', now);

        const candidates =
          await this.loansRepository.findOverdueCandidateLoans(todayWib);

        for (const candidate of candidates) {
          if (this.loansService) {
            await this.loansService.transition({
              loanId: candidate.id,
              targetStatus: 'OVERDUE',
              context: { todayWib },
            });
          } else {
            const lateDays = getWibDaysDifference(candidate.dueDate, todayWib);
            const fineAmount = calculateFine(lateDays);
            await this.loansRepository.transitionToOverdue({
              loanId: candidate.id,
              lateDays,
              fineAmount,
              now,
              bookTitle: candidate.bookTitle,
              userId: candidate.userId,
              dueDate: candidate.dueDate,
            });
          }
        }

        const finishedAt = activeClock.now();
        await this.repository.finishJobRun(
          runId,
          finishedAt,
          candidates.length,
        );

        return {
          job: 'status_overdue',
          rows_affected: candidates.length,
          started_at: now.toISOString(),
          finished_at: finishedAt.toISOString(),
        };
      },
    );
  }

  async runNotificationsJob(options?: {
    clock?: ClockPort | undefined;
    force?: boolean | undefined;
  }): Promise<RunJobData> {
    const activeClock = options?.clock ?? this.clock;
    const now = activeClock.now();

    const runId = await this.repository.createJobRun('notifications', now);
    const finishedAt = activeClock.now();
    await this.repository.finishJobRun(runId, finishedAt, 0);

    return {
      job: 'notifications',
      rows_affected: 0,
      started_at: now.toISOString(),
      finished_at: finishedAt.toISOString(),
    };
  }

  async runJob(
    jobName: JobName,
    clock?: ClockPort | undefined,
  ): Promise<RunJobData> {
    if (jobName === 'status_overdue') {
      return await this.runStatusOverdueJob(
        clock ? { clock, force: true } : { force: true },
      );
    }

    if (jobName === 'notifications') {
      return await this.runNotificationsJob(
        clock ? { clock, force: true } : { force: true },
      );
    }

    throw new Error(`Unsupported job: ${jobName}`);
  }

  async catchUp(clock?: ClockPort | undefined): Promise<RunJobData | null> {
    const activeClock = clock ?? this.clock;
    const now = activeClock.now();
    const lastRun =
      await this.repository.getLastSuccessfulRun('status_overdue');

    if (lastRun?.finishedAt && isSameWibDay(lastRun.startedAt, now)) {
      return null;
    }

    return await this.runStatusOverdueJob({ clock: activeClock, force: false });
  }

  startScheduler(): void {
    this.stopScheduler();

    const delayMs = calculateNextWibRunDelayMs(this.clock.now(), 0, 5);

    this.schedulerTimer = setTimeout(() => {
      void this.runStatusOverdueJob({ force: true })
        .catch((err) => {
          console.error('Scheduled status_overdue job failed:', err);
        })
        .finally(() => {
          this.startScheduler();
        });
    }, delayMs);

    if (
      this.schedulerTimer &&
      typeof this.schedulerTimer.unref === 'function'
    ) {
      this.schedulerTimer.unref();
    }
  }

  stopScheduler(): void {
    if (this.schedulerTimer) {
      clearTimeout(this.schedulerTimer);
      this.schedulerTimer = null;
    }
  }

  isSchedulerRunning(): boolean {
    return this.schedulerTimer !== null;
  }
}
