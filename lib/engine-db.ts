import Database from "better-sqlite3";
import { getEngineDbPath } from "./engine-paths";

export type DashboardStats = {
  totalJobs: number;
  totalReviews: number;
  totalLogs: number;
  applyCount: number;
  skipCount: number;
  avgScore: number | null;
};

export type FirmRow = {
  id: string;
  name: string;
  logoUrl: string | null;
  linkedinUrl: string | null;
  totalReviewedJobs: number;
  appliedJobs: number;
  skippedJobs: number;
  decisionIdsJson: string;
  updatedAt: string;
};

export type ReviewRow = {
  id: string;
  jobUrl: string;
  platform: string | null;
  source: string;
  status: string;
  score: number | null;
  threshold: number | null;
  decision: string | null;
  policyAllowed: number | null;
  reasons: string;
  summary: string | null;
  createdAt: string;
  title: string | null;
  company: string | null;
  location: string | null;
};

export type SystemLogRow = {
  id: string;
  level: string;
  scope: string;
  message: string;
  runType: string | null;
  jobUrl: string | null;
  createdAt: string;
};

function openDb(): Database.Database {
  return new Database(getEngineDbPath(), { readonly: true, fileMustExist: true });
}

export function readDashboardStats(): DashboardStats {
  const db = openDb();
  try {
    const counts = db
      .prepare(
        `
        SELECT
          (SELECT COUNT(*) FROM JobPosting) AS totalJobs,
          (SELECT COUNT(*) FROM JobReviewHistory) AS totalReviews,
          (SELECT COUNT(*) FROM SystemLog) AS totalLogs,
          (SELECT COUNT(*) FROM JobReviewHistory WHERE decision = 'APPLY') AS applyCount,
          (SELECT COUNT(*) FROM JobReviewHistory WHERE decision = 'SKIP') AS skipCount,
          (SELECT AVG(score) FROM JobReviewHistory WHERE score IS NOT NULL) AS avgScore
        `,
      )
      .get() as {
      totalJobs: number;
      totalReviews: number;
      totalLogs: number;
      applyCount: number;
      skipCount: number;
      avgScore: number | null;
    };

    return counts;
  } finally {
    db.close();
  }
}

export function readRecentReviews(limit = 20): ReviewRow[] {
  const db = openDb();
  try {
    return db
      .prepare(
        `
        SELECT
          h.id,
          h.jobUrl,
          h.platform,
          h.source,
          h.status,
          h.score,
          h.threshold,
          h.decision,
          h.policyAllowed,
          h.reasons,
          h.summary,
          h.createdAt,
          j.title,
          j.company,
          j.location
        FROM JobReviewHistory h
        LEFT JOIN JobPosting j ON j.id = h.jobPostingId
        ORDER BY h.createdAt DESC
        LIMIT ?
        `,
      )
      .all(limit) as ReviewRow[];
  } finally {
    db.close();
  }
}

export function readRecentLogs(limit = 20): SystemLogRow[] {
  const db = openDb();
  try {
    return db
      .prepare(
        `
        SELECT id, level, scope, message, runType, jobUrl, createdAt
        FROM SystemLog
        ORDER BY createdAt DESC
        LIMIT ?
        `,
      )
      .all(limit) as SystemLogRow[];
  } finally {
    db.close();
  }
}

export function readRecentFirms(limit = 12): FirmRow[] {
  const db = openDb();
  try {
    return db
      .prepare(
        `
        SELECT
          id,
          name,
          logoUrl,
          linkedinUrl,
          totalReviewedJobs,
          appliedJobs,
          skippedJobs,
          decisionIdsJson,
          updatedAt
        FROM Firm
        ORDER BY totalReviewedJobs DESC, updatedAt DESC
        LIMIT ?
        `,
      )
      .all(limit) as FirmRow[];
  } finally {
    db.close();
  }
}
