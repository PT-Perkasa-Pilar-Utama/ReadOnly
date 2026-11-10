import { apiGet } from './client';

export interface DashboardSummary {
  totalBooks: number;
  totalAvailability: number;
  borrowedCount: number;
  overdueCount: number;
  returnedCount: number;
  pieChart: {
    onTime: number;
    late: number;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isDashboardSummary(value: unknown): value is DashboardSummary {
  if (!isRecord(value) || !isRecord(value.pieChart)) {
    return false;
  }

  return (
    isNonNegativeInteger(value.totalBooks) &&
    isNonNegativeInteger(value.totalAvailability) &&
    isNonNegativeInteger(value.borrowedCount) &&
    isNonNegativeInteger(value.overdueCount) &&
    isNonNegativeInteger(value.returnedCount) &&
    isNonNegativeInteger(value.pieChart.onTime) &&
    isNonNegativeInteger(value.pieChart.late)
  );
}

export async function getDashboardSummary(
  signal?: AbortSignal,
): Promise<DashboardSummary> {
  const response = await apiGet<unknown>('/admin/dashboard/summary', signal);

  if (!isDashboardSummary(response)) {
    throw new Error('Format data dashboard tidak sesuai.');
  }

  return response;
}

export interface ReturnDistribution {
  total: number;
  onTimePercentage: number;
  latePercentage: number;
}

export function getReturnDistribution(
  pieChart: DashboardSummary['pieChart'],
): ReturnDistribution {
  const total = pieChart.onTime + pieChart.late;

  if (total === 0) {
    return {
      total: 0,
      onTimePercentage: 0,
      latePercentage: 0,
    };
  }

  return {
    total,
    onTimePercentage: (pieChart.onTime / total) * 100,
    latePercentage: (pieChart.late / total) * 100,
  };
}
