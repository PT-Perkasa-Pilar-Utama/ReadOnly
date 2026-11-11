import { Elysia } from 'elysia';
import type { ClockPort } from '../../ports/clock';
import { fromZodError } from '../../shared/errors';
import { runJobSchema } from './jobs.schema';
import type { JobsService } from './jobs.service';

export function createJobsRoutes(jobsService: JobsService, clock?: ClockPort) {
  const router = new Elysia();

  // SEC-13: Operational endpoint POST /admin/jobs/run is NEVER registered in production.
  if (process.env.APP_ENV === 'production') {
    return router;
  }

  return router.post('/admin/jobs/run', async ({ body, query }) => {
    const rawBody = (body ?? {}) as { job?: unknown };
    const rawQuery = (query ?? {}) as { job?: unknown };
    const jobInput = rawBody.job ?? rawQuery.job;

    const parsed = runJobSchema.safeParse({ job: jobInput });
    if (!parsed.success) {
      throw fromZodError(parsed.error);
    }

    const result = await jobsService.runJob(parsed.data.job, clock);
    return {
      data: result,
    };
  });
}
