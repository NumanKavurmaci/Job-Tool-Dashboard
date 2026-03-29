import { readRecentArtifacts } from "./engine-artifacts";
import { readDashboardStats, readRecentFirms, readRecentLogs, readRecentReviews } from "./engine-db";
import { getEngineRoot } from "./engine-paths";

export function getDashboardData() {
  return {
    engineRoot: getEngineRoot(),
    stats: readDashboardStats(),
    firms: readRecentFirms(),
    reviews: readRecentReviews(),
    logs: readRecentLogs(),
    artifacts: readRecentArtifacts(),
  };
}

export type DashboardData = ReturnType<typeof getDashboardData>;
