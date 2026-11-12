import { z } from 'zod';

export const dashboardPieChartSchema = z.object({
  onTime: z.number().int().nonnegative(),
  late: z.number().int().nonnegative(),
});

export type DashboardPieChart = z.infer<typeof dashboardPieChartSchema>;

export const dashboardSummaryDataSchema = z.object({
  totalBooks: z.number().int().nonnegative(),
  totalAvailability: z.number().int().nonnegative(),
  borrowedCount: z.number().int().nonnegative(),
  overdueCount: z.number().int().nonnegative(),
  returnedCount: z.number().int().nonnegative(),
  pieChart: dashboardPieChartSchema,
});

export type DashboardSummaryData = z.infer<typeof dashboardSummaryDataSchema>;

export const dashboardSummaryResponseSchema = z.object({
  data: dashboardSummaryDataSchema,
  message: z.string().optional(),
});

export type DashboardSummaryResponse = z.infer<
  typeof dashboardSummaryResponseSchema
>;
