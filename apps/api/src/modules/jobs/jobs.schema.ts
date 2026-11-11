import type { JobName } from '@readonly/shared';
import { z } from 'zod';

const JOB_NAME_TUPLE = [
  'status_overdue',
  'notifications',
] as const satisfies readonly [JobName, ...JobName[]];

export const runJobSchema = z.object({
  job: z.enum(JOB_NAME_TUPLE),
});

export type RunJobInput = z.infer<typeof runJobSchema>;

export const runJobDataSchema = z.object({
  job: z.enum(JOB_NAME_TUPLE),
  rows_affected: z.number().int().nonnegative(),
  started_at: z.string(),
  finished_at: z.string(),
  skipped: z.boolean().optional(),
});

export type RunJobData = z.infer<typeof runJobDataSchema>;

export const runJobResponseSchema = z.object({
  data: runJobDataSchema,
});

export type RunJobResponse = z.infer<typeof runJobResponseSchema>;
