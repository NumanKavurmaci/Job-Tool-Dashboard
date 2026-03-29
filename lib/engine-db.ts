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
  companyLinkedinUrl: string | null;
  location: string | null;
};

export type DecisionRow = {
  id: string;
  decision: string;
  score: number;
  threshold: number | null;
  policyAllowed: number;
  reasons: string;
  createdAt: string;
  jobPostingId: string;
  jobUrl: string;
  title: string | null;
  company: string | null;
  companyLogoUrl: string | null;
  companyLinkedinUrl: string | null;
  location: string | null;
  normalizedJson: string | null;
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

export type PreparedAnswerSetRow = {
  id: string;
  jobPostingId: string | null;
  createdAt: string;
  questionsJson: string;
  answersJson: string;
  jobUrl: string | null;
  title: string | null;
  company: string | null;
};

export type AnswerCacheRow = {
  id: string;
  normalizedQuestion: string;
  label: string;
  questionType: string;
  strategy: string;
  answerJson: string;
  confidenceLabel: string;
  source: string;
  notesJson: string | null;
  createdAt: string;
  updatedAt: string;
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
          j.companyLinkedinUrl,
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

export function readPreparedAnswerSets(limit = 20): PreparedAnswerSetRow[] {
  const db = openDb();
  try {
    return db
      .prepare(
        `
        SELECT
          p.id,
          p.jobPostingId,
          p.createdAt,
          p.questionsJson,
          p.answersJson,
          j.url AS jobUrl,
          j.title,
          j.company
        FROM PreparedAnswerSet p
        LEFT JOIN JobPosting j ON j.id = p.jobPostingId
        ORDER BY p.createdAt DESC
        LIMIT ?
        `,
      )
      .all(limit) as PreparedAnswerSetRow[];
  } finally {
    db.close();
  }
}

export function readAnswerCache(limit = 30): AnswerCacheRow[] {
  const db = openDb();
  try {
    return db
      .prepare(
        `
        SELECT
          id,
          normalizedQuestion,
          label,
          questionType,
          strategy,
          answerJson,
          confidenceLabel,
          source,
          notesJson,
          createdAt,
          updatedAt
        FROM AnswerCacheEntry
        ORDER BY updatedAt DESC
        LIMIT ?
        `,
      )
      .all(limit) as AnswerCacheRow[];
  } finally {
    db.close();
  }
}

export function readRecentDecisions(args?: {
  limit?: number;
  decisionId?: string;
  company?: string;
  jobUrl?: string;
}): DecisionRow[] {
  const db = openDb();
  try {
    const limit = args?.limit ?? 40;
    const whereClauses: string[] = [];
    const params: Array<string | number> = [];

    if (args?.decisionId) {
      whereClauses.push("d.id = ?");
      params.push(args.decisionId);
    }

    if (args?.company) {
      whereClauses.push("j.company = ?");
      params.push(args.company);
    }

    if (args?.jobUrl) {
      whereClauses.push("j.url = ?");
      params.push(args.jobUrl);
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(" AND ")}` : "";

    return db
      .prepare(
        `
        SELECT
          d.id,
          d.decision,
          d.score,
          (
            SELECT h.threshold
            FROM JobReviewHistory h
            WHERE h.jobPostingId = d.jobPostingId
              AND h.decision = d.decision
              AND h.threshold IS NOT NULL
            ORDER BY h.createdAt DESC
            LIMIT 1
          ) AS threshold,
          d.policyAllowed,
          d.reasons,
          d.createdAt,
          d.jobPostingId,
          j.url AS jobUrl,
          j.title,
          j.company,
          j.companyLogoUrl,
          j.companyLinkedinUrl,
          j.location,
          j.normalizedJson
        FROM ApplicationDecision d
        INNER JOIN JobPosting j ON j.id = d.jobPostingId
        ${whereSql}
        ORDER BY d.createdAt DESC
        LIMIT ?
        `,
      )
      .all(...params, limit) as DecisionRow[];
  } finally {
    db.close();
  }
}
