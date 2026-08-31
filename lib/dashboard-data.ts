import { readRecentArtifacts } from "./engine-artifacts";
import {
  readAnswerCache,
  readAppliedJobs,
  readDashboardStats,
  readIncompleteApplications,
  readTopApplications,
  readTopMissedHighScoreJobs,
  readTopPendingApprovedJobs,
  readPreparedAnswerSets,
  readRecommendations,
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
    recommendations: readRecommendations(),
    appliedJobs: readAppliedJobs(),
    decisions: readRecentDecisions(),
    preparedAnswerSets: readPreparedAnswerSets(),
    answerCache: readAnswerCache(),
    reviews: readRecentReviews(),
    logs: readRecentLogs(),
    artifacts: readRecentArtifacts(),
    topApplications: readTopApplications(),
    incompleteApplications: readIncompleteApplications(),
    topMissedHighScoreJobs: readTopMissedHighScoreJobs(),
    topPendingApprovedJobs: readTopPendingApprovedJobs(),
  };
}

export type DashboardData = ReturnType<typeof getDashboardData>;
