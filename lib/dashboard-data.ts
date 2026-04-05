import { readRecentArtifacts } from "./engine-artifacts";
import {
  readAnswerCache,
  readDashboardStats,
  readTopApplications,
  readTopMissedHighScoreJobs,
  readTopPendingApprovedJobs,
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
    topApplications: readTopApplications(),
    topMissedHighScoreJobs: readTopMissedHighScoreJobs(),
    topPendingApprovedJobs: readTopPendingApprovedJobs(),
  };
}

export type DashboardData = ReturnType<typeof getDashboardData>;
