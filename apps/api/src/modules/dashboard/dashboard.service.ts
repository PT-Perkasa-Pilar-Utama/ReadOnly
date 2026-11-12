import type {
  DashboardRepository,
  DashboardSummary,
} from './dashboard.repository';

export class DashboardService {
  constructor(private readonly repository: DashboardRepository) {}

  async getSummary(): Promise<DashboardSummary> {
    return this.repository.getSummary();
  }
}

