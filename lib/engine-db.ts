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

export type SearchResultRow = {
  id: string;
  collection:
    | "jobs"
    | "reviews"
    | "decisions"
    | "companies"
    | "answers"
    | "answer-cache"
    | "logs";
  title: string;
  subtitle: string | null;
  body: string | null;
  createdAt: string | null;
  primaryUrl: string | null;
  secondaryUrl: string | null;
  secondaryLabel: string | null;
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

export function searchCollections(query: string, limitPerCollection = 6): SearchResultRow[] {
  const db = openDb();
  try {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      return [];
    }

    const term = `%${trimmed.toLowerCase()}%`;
    const results: SearchResultRow[] = [];

    const jobs = db
      .prepare(
        `
        SELECT
          id,
          url,
          title,
          company,
          location,
          createdAt
        FROM JobPosting
        WHERE lower(coalesce(title, '')) LIKE ?
           OR lower(coalesce(company, '')) LIKE ?
           OR lower(coalesce(location, '')) LIKE ?
           OR lower(coalesce(url, '')) LIKE ?
        ORDER BY createdAt DESC
        LIMIT ?
        `,
      )
      .all(term, term, term, term, limitPerCollection) as Array<{
      id: string;
      url: string;
      title: string | null;
      company: string | null;
      location: string | null;
      createdAt: string | null;
    }>;

    results.push(
      ...jobs.map((row) => ({
        id: row.id,
        collection: "jobs" as const,
        title: row.title ?? "Unknown title",
        subtitle: row.company ?? "Unknown company",
        body: row.location ?? null,
        createdAt: row.createdAt,
        primaryUrl: row.url,
        secondaryUrl: row.url ? `/decisions?jobUrl=${encodeURIComponent(row.url)}` : null,
        secondaryLabel: row.url ? "View related decisions" : null,
      })),
    );

    const reviews = db
      .prepare(
        `
        SELECT
          h.id,
          h.jobUrl,
          h.summary,
          h.source,
          h.createdAt,
          j.title,
          j.company
        FROM JobReviewHistory h
        LEFT JOIN JobPosting j ON j.id = h.jobPostingId
        WHERE lower(coalesce(j.title, '')) LIKE ?
           OR lower(coalesce(j.company, '')) LIKE ?
           OR lower(coalesce(h.summary, '')) LIKE ?
           OR lower(coalesce(h.reasons, '')) LIKE ?
           OR lower(coalesce(h.jobUrl, '')) LIKE ?
        ORDER BY h.createdAt DESC
        LIMIT ?
        `,
      )
      .all(term, term, term, term, term, limitPerCollection) as Array<{
      id: string;
      jobUrl: string;
      summary: string | null;
      source: string;
      createdAt: string | null;
      title: string | null;
      company: string | null;
    }>;

    results.push(
      ...reviews.map((row) => ({
        id: row.id,
        collection: "reviews" as const,
        title: row.title ?? "Unknown title",
        subtitle: row.company ? `${row.company} • ${row.source}` : row.source,
        body: row.summary,
        createdAt: row.createdAt,
        primaryUrl: row.jobUrl,
        secondaryUrl: `/reviews`,
        secondaryLabel: "Open review history",
      })),
    );

    const decisions = db
      .prepare(
        `
        SELECT
          d.id,
          d.decision,
          d.score,
          d.createdAt,
          j.url AS jobUrl,
          j.title,
          j.company
        FROM ApplicationDecision d
        INNER JOIN JobPosting j ON j.id = d.jobPostingId
        WHERE lower(coalesce(j.title, '')) LIKE ?
           OR lower(coalesce(j.company, '')) LIKE ?
           OR lower(coalesce(d.reasons, '')) LIKE ?
           OR lower(coalesce(j.url, '')) LIKE ?
           OR lower(coalesce(d.id, '')) LIKE ?
        ORDER BY d.createdAt DESC
        LIMIT ?
        `,
      )
      .all(term, term, term, term, term, limitPerCollection) as Array<{
      id: string;
      decision: string;
      score: number;
      createdAt: string | null;
      jobUrl: string;
      title: string | null;
      company: string | null;
    }>;

    results.push(
      ...decisions.map((row) => ({
        id: row.id,
        collection: "decisions" as const,
        title: row.title ?? "Unknown title",
        subtitle: `${row.company ?? "Unknown company"} • ${row.decision} • ${row.score}`,
        body: `Decision ID: ${row.id}`,
        createdAt: row.createdAt,
        primaryUrl: row.jobUrl,
        secondaryUrl: `/decisions?decisionId=${encodeURIComponent(row.id)}`,
        secondaryLabel: "Open decision detail",
      })),
    );

    const firms = db
      .prepare(
        `
        SELECT
          id,
          name,
          linkedinUrl,
          totalReviewedJobs,
          appliedJobs,
          skippedJobs,
          updatedAt
        FROM Firm
        WHERE lower(coalesce(name, '')) LIKE ?
           OR lower(coalesce(linkedinUrl, '')) LIKE ?
        ORDER BY totalReviewedJobs DESC, updatedAt DESC
        LIMIT ?
        `,
      )
      .all(term, term, limitPerCollection) as Array<{
      id: string;
      name: string;
      linkedinUrl: string | null;
      totalReviewedJobs: number;
      appliedJobs: number;
      skippedJobs: number;
      updatedAt: string | null;
    }>;

    results.push(
      ...firms.map((row) => ({
        id: row.id,
        collection: "companies" as const,
        title: row.name,
        subtitle: `${row.totalReviewedJobs} reviewed • ${row.appliedJobs} apply • ${row.skippedJobs} skip`,
        body: row.linkedinUrl,
        createdAt: row.updatedAt,
        primaryUrl: row.linkedinUrl,
        secondaryUrl: `/companies`,
        secondaryLabel: "Open companies view",
      })),
    );

    const answers = db
      .prepare(
        `
        SELECT
          p.id,
          p.createdAt,
          p.questionsJson,
          j.url AS jobUrl,
          j.title,
          j.company
        FROM PreparedAnswerSet p
        LEFT JOIN JobPosting j ON j.id = p.jobPostingId
        WHERE lower(coalesce(j.title, '')) LIKE ?
           OR lower(coalesce(j.company, '')) LIKE ?
           OR lower(coalesce(p.questionsJson, '')) LIKE ?
        ORDER BY p.createdAt DESC
        LIMIT ?
        `,
      )
      .all(term, term, term, limitPerCollection) as Array<{
      id: string;
      createdAt: string | null;
      questionsJson: string;
      jobUrl: string | null;
      title: string | null;
      company: string | null;
    }>;

    results.push(
      ...answers.map((row) => ({
        id: row.id,
        collection: "answers" as const,
        title: row.title ?? "Prepared answer set",
        subtitle: row.company ?? "Unknown company",
        body: row.questionsJson.slice(0, 180),
        createdAt: row.createdAt,
        primaryUrl: row.jobUrl,
        secondaryUrl: `/answers`,
        secondaryLabel: "Open answers view",
      })),
    );

    const answerCache = db
      .prepare(
        `
        SELECT
          id,
          normalizedQuestion,
          label,
          questionType,
          updatedAt
        FROM AnswerCacheEntry
        WHERE lower(coalesce(normalizedQuestion, '')) LIKE ?
           OR lower(coalesce(label, '')) LIKE ?
           OR lower(coalesce(questionType, '')) LIKE ?
        ORDER BY updatedAt DESC
        LIMIT ?
        `,
      )
      .all(term, term, term, limitPerCollection) as Array<{
      id: string;
      normalizedQuestion: string;
      label: string;
      questionType: string;
      updatedAt: string | null;
    }>;

    results.push(
      ...answerCache.map((row) => ({
        id: row.id,
        collection: "answer-cache" as const,
        title: row.label,
        subtitle: row.questionType,
        body: row.normalizedQuestion,
        createdAt: row.updatedAt,
        primaryUrl: null,
        secondaryUrl: `/answers`,
        secondaryLabel: "Open answers view",
      })),
    );

    const logs = db
      .prepare(
        `
        SELECT
          id,
          level,
          scope,
          message,
          runType,
          jobUrl,
          createdAt
        FROM SystemLog
        WHERE lower(coalesce(message, '')) LIKE ?
           OR lower(coalesce(scope, '')) LIKE ?
           OR lower(coalesce(runType, '')) LIKE ?
           OR lower(coalesce(jobUrl, '')) LIKE ?
        ORDER BY createdAt DESC
        LIMIT ?
        `,
      )
      .all(term, term, term, term, limitPerCollection) as Array<{
      id: string;
      level: string;
      scope: string;
      message: string;
      runType: string | null;
      jobUrl: string | null;
      createdAt: string | null;
    }>;

    results.push(
      ...logs.map((row) => ({
        id: row.id,
        collection: "logs" as const,
        title: `${row.level} • ${row.scope}`,
        subtitle: row.runType,
        body: row.message,
        createdAt: row.createdAt,
        primaryUrl: row.jobUrl,
        secondaryUrl: `/`,
        secondaryLabel: "Open overview",
      })),
    );

    return results.sort((a, b) => {
      const timeA = a.createdAt ? Date.parse(a.createdAt) : 0;
      const timeB = b.createdAt ? Date.parse(b.createdAt) : 0;
      return timeB - timeA;
    });
  } finally {
    db.close();
  }
}
