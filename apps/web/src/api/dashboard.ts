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

const LOCAL_DASHBOARD_FIXTURE: DashboardSummary = {
  totalBooks: 12,
  totalAvailability: 8,
  borrowedCount: 2,
  overdueCount: 6,
  returnedCount: 2,
  pieChart: {
    onTime: 1,
    late: 1,
  },
};

// Local development uses a fixture until the Dashboard API endpoint is implemented.
// Set VITE_DASHBOARD_DATA_SOURCE=api to test the real endpoint before production.
const USE_LOCAL_DASHBOARD_FIXTURE =
  import.meta.env?.DEV && import.meta.env?.VITE_DASHBOARD_DATA_SOURCE !== 'api';

export const isDashboardUsingLocalFixture = USE_LOCAL_DASHBOARD_FIXTURE;

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

function isDashboardSummary(value: unknown): value is DashboardSummary {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const summary = value as Record<string, unknown>;
  const pieChart = summary.pieChart;

  if (typeof pieChart !== 'object' || pieChart === null || Array.isArray(pieChart)) {
    return false;
  }

  const chart = pieChart as Record<string, unknown>;

  return (
    isNonNegativeInteger(summary.totalBooks) &&
    isNonNegativeInteger(summary.totalAvailability) &&
    isNonNegativeInteger(summary.borrowedCount) &&
    isNonNegativeInteger(summary.overdueCount) &&
    isNonNegativeInteger(summary.returnedCount) &&
    isNonNegativeInteger(chart.onTime) &&
    isNonNegativeInteger(chart.late)
  );
}

export async function getDashboardSummary(signal?: AbortSignal): Promise<DashboardSummary> {
  if (USE_LOCAL_DASHBOARD_FIXTURE) {
    return {
      ...LOCAL_DASHBOARD_FIXTURE,
      pieChart: { ...LOCAL_DASHBOARD_FIXTURE.pieChart },
    };
  }

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
