import { readRecentArtifacts } from "./engine-artifacts";
import {
  readAnswerCache,
  readDashboardStats,
  readPreparedAnswerSets,
  readRecentDecisions,
  readRecentFirms,
  readRecentLogs,
  readRecentReviews,
} from "./engine-db";
import { getEngineRoot } from "./engine-paths";

export function getDashboardData() {
  return {
    engineRoot: getEngineRoot(),
    stats: readDashboardStats(),
    firms: readRecentFirms(),
    decisions: readRecentDecisions(),
    preparedAnswerSets: readPreparedAnswerSets(),
    answerCache: readAnswerCache(),
    reviews: readRecentReviews(),
    logs: readRecentLogs(),
    artifacts: readRecentArtifacts(),
  };
}

export type DashboardData = ReturnType<typeof getDashboardData>;
