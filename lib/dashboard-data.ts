import { readRecentArtifacts } from "./engine-artifacts";
import { readDashboardStats, readRecentLogs, readRecentReviews } from "./engine-db";
import { getEngineRoot } from "./engine-paths";

export function getDashboardData() {
  return {
    engineRoot: getEngineRoot(),
    stats: readDashboardStats(),
    reviews: readRecentReviews(),
    logs: readRecentLogs(),
    artifacts: readRecentArtifacts(),
  };
}

export type DashboardData = ReturnType<typeof getDashboardData>;
