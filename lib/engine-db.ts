import Database from "better-sqlite3";
import { getEngineDbPath } from "./engine-paths";

export type DashboardStats = {
  totalJobs: number;
  totalReviews: number;
  totalLogs: number;
  applyCount: number;
  skipCount: number;
  incompleteApplyCount: number;
  recommendationCount: number;
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
  detailsJson: string | null;
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

export type SearchCollectionKey =
  | "jobs"
  | "reviews"
  | "decisions"
  | "companies"
  | "answers"
  | "answer-cache"
  | "logs";

export type SearchCollectionOption = SearchCollectionKey | "all";
export type SearchFilter = "applied" | "skipped" | "error" | "pending" | "incomplete";
export type SearchSort = "newest" | "oldest" | "top-score" | "company-az";

export type SearchOptions = {
  query: string;
  collections?: SearchCollectionOption[];
  filters?: SearchFilter[];
  sort?: SearchSort;
  limitPerCollection?: number;
};

export type SearchResultRow = {
  id: string;
  collection: SearchCollectionKey;
  title: string;
  subtitle: string | null;
  body: string | null;
  createdAt: string | null;
  primaryUrl: string | null;
  secondaryUrl: string | null;
  secondaryLabel: string | null;
  score?: number | null;
  decision?: string | null;
  status?: string | null;
  level?: string | null;
};

export type HomeHighlightRow = {
  id: string;
  jobUrl: string;
  status: string;
  decision: string | null;
  score: number | null;
  summary: string | null;
  source: string;
  createdAt: string;
  title: string | null;
  company: string | null;
  companyLinkedinUrl: string | null;
  location: string | null;
};

export type RecommendationRow = {
  id: string;
  recommendationStatus: string;
  source: string;
  score: number;
  decision: string;
  policyAllowed: number;
  summary: string;
  reasons: string;
  detailsJson: string | null;
  createdAt: string;
  updatedAt: string;
  jobPostingId: string;
  jobUrl: string;
  title: string | null;
  company: string | null;
  companyLogoUrl: string | null;
  companyLinkedinUrl: string | null;
  location: string | null;
  normalizedJson: string | null;
};

export const SEARCH_COLLECTION_OPTIONS: Array<{
  value: SearchCollectionOption;
  label: string;
}> = [
  { value: "all", label: "All" },
  { value: "jobs", label: "Jobs" },
  { value: "reviews", label: "Review History" },
  { value: "decisions", label: "Decisions" },
  { value: "companies", label: "Companies" },
  { value: "answers", label: "Prepared Answers" },
  { value: "answer-cache", label: "Answer Cache" },
  { value: "logs", label: "System Logs" },
];

export const SEARCH_FILTER_OPTIONS: Array<{
  value: SearchFilter;
  label: string;
}> = [
  { value: "applied", label: "Applied" },
  { value: "incomplete", label: "Incomplete apply" },
  { value: "skipped", label: "Skipped" },
  { value: "error", label: "Error" },
  { value: "pending", label: "Pending" },
];

export const SEARCH_SORT_OPTIONS: Array<{
  value: SearchSort;
  label: string;
}> = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "top-score", label: "Top score" },
  { value: "company-az", label: "Company A-Z" },
];

function openDb(): Database.Database {
  return new Database(getEngineDbPath(), { readonly: true, fileMustExist: true });
}

function toSearchCollectionKeys(
  collections: SearchCollectionOption[] | undefined,
): SearchCollectionKey[] {
  const requested = collections?.length ? collections : ["all"];
  if (requested.includes("all")) {
    return SEARCH_COLLECTION_OPTIONS
      .filter((option): option is { value: SearchCollectionKey; label: string } => option.value !== "all")
      .map((option) => option.value);
  }

  return [...new Set(requested.filter((value): value is SearchCollectionKey => value !== "all"))];
}

function buildFilterClause(clauses: string[]): string {
  return clauses.length > 0 ? ` AND (${clauses.join(" OR ")})` : "";
}

function compareSearchResults(sort: SearchSort, left: SearchResultRow, right: SearchResultRow): number {
  if (sort === "top-score") {
    const scoreDelta = (right.score ?? -1) - (left.score ?? -1);
    if (scoreDelta !== 0) {
      return scoreDelta;
    }
  }

  if (sort === "company-az") {
    const companyDelta = (left.subtitle ?? left.title).localeCompare(right.subtitle ?? right.title);
    if (companyDelta !== 0) {
      return companyDelta;
    }
  }

  const leftTime = left.createdAt ? Date.parse(left.createdAt) : 0;
  const rightTime = right.createdAt ? Date.parse(right.createdAt) : 0;
  return sort === "oldest" ? leftTime - rightTime : rightTime - leftTime;
}

function fallbackPostingField(field: "title" | "company" | "companyLinkedinUrl" | "location", jobUrlColumn: string) {
  return `(
    SELECT jp.${field}
    FROM JobPosting jp
    WHERE jp.url = ${jobUrlColumn}
    LIMIT 1
  )`;
}

export function readDashboardStats(): DashboardStats {
  const db = openDb();
  try {
    return db
      .prepare(
        `
        SELECT
          (SELECT COUNT(*) FROM JobPosting) AS totalJobs,
          (SELECT COUNT(*) FROM JobReviewHistory) AS totalReviews,
          (SELECT COUNT(*) FROM SystemLog) AS totalLogs,
          (SELECT COUNT(*) FROM JobReviewHistory WHERE decision = 'APPLY') AS applyCount,
          (SELECT COUNT(*) FROM JobReviewHistory WHERE decision = 'SKIP') AS skipCount,
          (
            SELECT COUNT(*)
            FROM JobRecommendation
            WHERE recommendationStatus = 'RECOMMENDED'
          ) AS recommendationCount,
          (
            SELECT COUNT(*)
            FROM JobReviewHistory h
            WHERE h.decision = 'APPLY'
              AND h.status != 'SUBMITTED'
              AND NOT EXISTS (
                SELECT 1
                FROM JobReviewHistory newer
                WHERE newer.jobUrl = h.jobUrl
                  AND newer.createdAt > h.createdAt
              )
          ) AS incompleteApplyCount,
          (SELECT AVG(score) FROM JobReviewHistory WHERE score IS NOT NULL) AS avgScore
        `,
      )
      .get() as DashboardStats;
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
          h.detailsJson,
          h.createdAt,
          COALESCE(j.title, ${fallbackPostingField("title", "h.jobUrl")}) AS title,
          COALESCE(j.company, ${fallbackPostingField("company", "h.jobUrl")}) AS company,
          COALESCE(j.companyLinkedinUrl, ${fallbackPostingField("companyLinkedinUrl", "h.jobUrl")}) AS companyLinkedinUrl,
          COALESCE(j.location, ${fallbackPostingField("location", "h.jobUrl")}) AS location
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

function readLatestReviewHighlightsByWhere(whereSql: string, limit: number): HomeHighlightRow[] {
  const db = openDb();
  try {
    return db
      .prepare(
        `
        SELECT
          h.id,
          h.jobUrl,
          h.status,
          h.decision,
          h.score,
          h.summary,
          h.source,
          h.createdAt,
          COALESCE(j.title, ${fallbackPostingField("title", "h.jobUrl")}) AS title,
          COALESCE(j.company, ${fallbackPostingField("company", "h.jobUrl")}) AS company,
          COALESCE(j.companyLinkedinUrl, ${fallbackPostingField("companyLinkedinUrl", "h.jobUrl")}) AS companyLinkedinUrl,
          COALESCE(j.location, ${fallbackPostingField("location", "h.jobUrl")}) AS location
        FROM JobReviewHistory h
        LEFT JOIN JobPosting j ON j.id = h.jobPostingId
        WHERE ${whereSql}
          AND NOT EXISTS (
            SELECT 1
            FROM JobReviewHistory newer
            WHERE newer.jobUrl = h.jobUrl
              AND newer.createdAt > h.createdAt
          )
        ORDER BY h.score DESC, h.createdAt DESC
        LIMIT ?
        `,
      )
      .all(limit) as HomeHighlightRow[];
  } finally {
    db.close();
  }
}

export function readTopApplications(limit = 6): HomeHighlightRow[] {
  return readLatestReviewHighlightsByWhere(
    `h.decision = 'APPLY' AND h.status = 'SUBMITTED'`,
    limit,
  );
}

export function readTopMissedHighScoreJobs(limit = 6): HomeHighlightRow[] {
  return readLatestReviewHighlightsByWhere(
    `h.decision = 'APPLY' AND h.status = 'FAILED'`,
    limit,
  );
}

export function readTopPendingApprovedJobs(limit = 6): HomeHighlightRow[] {
  return readLatestReviewHighlightsByWhere(
    `h.decision = 'APPLY' AND h.status IN ('READY_TO_SUBMIT', 'EVALUATED', 'VIEWED')`,
    limit,
  );
}

export function readIncompleteApplications(limit = 12): HomeHighlightRow[] {
  return readLatestReviewHighlightsByWhere(
    `h.decision = 'APPLY' AND h.status != 'SUBMITTED'`,
    limit,
  );
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
          COALESCE(
            j.url,
            json_extract(p.answersJson, '$.originalJobUrl'),
            json_extract(p.answersJson, '$.sourceUrl')
          ) AS jobUrl,
          COALESCE(j.title, (
            SELECT jp.title
            FROM JobPosting jp
            WHERE jp.url = json_extract(p.answersJson, '$.originalJobUrl')
               OR jp.url = json_extract(p.answersJson, '$.sourceUrl')
               OR jp.url = json_extract(p.answersJson, '$.finalUrl')
            LIMIT 1
          )) AS title,
          COALESCE(j.company, (
            SELECT jp.company
            FROM JobPosting jp
            WHERE jp.url = json_extract(p.answersJson, '$.originalJobUrl')
               OR jp.url = json_extract(p.answersJson, '$.sourceUrl')
               OR jp.url = json_extract(p.answersJson, '$.finalUrl')
            LIMIT 1
          )) AS company
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

export function readRecommendations(limit = 40): RecommendationRow[] {
  const db = openDb();
  try {
    return db
      .prepare(
        `
        SELECT
          r.id,
          r.recommendationStatus,
          r.source,
          r.score,
          r.decision,
          r.policyAllowed,
          r.summary,
          r.reasons,
          r.detailsJson,
          r.createdAt,
          r.updatedAt,
          r.jobPostingId,
          j.url AS jobUrl,
          j.title,
          j.company,
          j.companyLogoUrl,
          j.companyLinkedinUrl,
          j.location,
          j.normalizedJson
        FROM JobRecommendation r
        INNER JOIN JobPosting j ON j.id = r.jobPostingId
        WHERE r.recommendationStatus = 'RECOMMENDED'
        ORDER BY r.score DESC, r.updatedAt DESC
        LIMIT ?
        `,
      )
      .all(limit) as RecommendationRow[];
  } finally {
    db.close();
  }
}

export function searchCollections(
  input: string | SearchOptions,
  legacyLimitPerCollection = 6,
): SearchResultRow[] {
  const options =
    typeof input === "string"
      ? ({ query: input, limitPerCollection: legacyLimitPerCollection } satisfies SearchOptions)
      : input;
  const trimmed = options.query.trim();
  if (trimmed.length < 2) {
    return [];
  }

  const db = openDb();
  try {
    const collections = toSearchCollectionKeys(options.collections);
    const filters = [...new Set(options.filters ?? [])];
    const sort = options.sort ?? "newest";
    const limitPerCollection = options.limitPerCollection ?? legacyLimitPerCollection;
    const term = `%${trimmed.toLowerCase()}%`;
    const results: SearchResultRow[] = [];

    if (collections.includes("jobs")) {
      const filterClauses = filters.flatMap((filter) => {
        switch (filter) {
          case "applied":
            return [`EXISTS (SELECT 1 FROM JobReviewHistory h WHERE h.jobUrl = JobPosting.url AND (h.decision = 'APPLY' OR h.status = 'SUBMITTED'))`];
          case "incomplete":
            return [`EXISTS (SELECT 1 FROM JobReviewHistory h WHERE h.jobUrl = JobPosting.url AND h.decision = 'APPLY' AND h.status != 'SUBMITTED')`];
          case "skipped":
            return [`EXISTS (SELECT 1 FROM JobReviewHistory h WHERE h.jobUrl = JobPosting.url AND (h.decision = 'SKIP' OR h.status LIKE 'SKIPPED%'))`];
          case "error":
            return [
              `EXISTS (SELECT 1 FROM JobReviewHistory h WHERE h.jobUrl = JobPosting.url AND h.status = 'FAILED')`,
              `EXISTS (SELECT 1 FROM SystemLog l WHERE l.jobUrl = JobPosting.url AND l.level = 'ERROR')`,
            ];
          case "pending":
            return [`EXISTS (SELECT 1 FROM JobReviewHistory h WHERE h.jobUrl = JobPosting.url AND h.status IN ('VIEWED', 'EVALUATED', 'READY_TO_SUBMIT'))`];
        }
      });

      const rows = db
        .prepare(
          `
          SELECT
            id,
            url,
            title,
            company,
            location,
            createdAt,
            (SELECT MAX(COALESCE(h.score, 0)) FROM JobReviewHistory h WHERE h.jobUrl = JobPosting.url) AS score,
            (SELECT h.status FROM JobReviewHistory h WHERE h.jobUrl = JobPosting.url ORDER BY h.createdAt DESC LIMIT 1) AS status,
            (SELECT h.decision FROM JobReviewHistory h WHERE h.jobUrl = JobPosting.url ORDER BY h.createdAt DESC LIMIT 1) AS decision
          FROM JobPosting
          WHERE (
              lower(coalesce(title, '')) LIKE ?
           OR lower(coalesce(company, '')) LIKE ?
           OR lower(coalesce(location, '')) LIKE ?
           OR lower(coalesce(url, '')) LIKE ?
          )
          ${buildFilterClause(filterClauses)}
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
        score: number | null;
        status: string | null;
        decision: string | null;
      }>;

      results.push(
        ...rows.map((row) => ({
          id: row.id,
          collection: "jobs" as const,
          title: row.title ?? "Unknown title",
          subtitle: row.company ?? "Unknown company",
          body: row.location ?? null,
          createdAt: row.createdAt,
          primaryUrl: row.url,
          secondaryUrl: row.url ? `/decisions?jobUrl=${encodeURIComponent(row.url)}` : null,
          secondaryLabel: row.url ? "View related decisions" : null,
          score: row.score,
          status: row.status,
          decision: row.decision,
        })),
      );
    }

    if (collections.includes("reviews")) {
      const filterClauses = filters.map((filter) => {
        switch (filter) {
          case "applied":
            return `(h.decision = 'APPLY' OR h.status = 'SUBMITTED')`;
          case "incomplete":
            return `(h.decision = 'APPLY' AND h.status != 'SUBMITTED')`;
          case "skipped":
            return `(h.decision = 'SKIP' OR h.status LIKE 'SKIPPED%')`;
          case "error":
            return `h.status = 'FAILED'`;
          case "pending":
            return `h.status IN ('VIEWED', 'EVALUATED', 'READY_TO_SUBMIT')`;
        }
      });

      const rows = db
        .prepare(
          `
          SELECT
            h.id,
            h.jobUrl,
            h.summary,
            h.source,
            h.createdAt,
            h.score,
            h.status,
            h.decision,
            COALESCE(j.title, ${fallbackPostingField("title", "h.jobUrl")}) AS title,
            COALESCE(j.company, ${fallbackPostingField("company", "h.jobUrl")}) AS company
          FROM JobReviewHistory h
          LEFT JOIN JobPosting j ON j.id = h.jobPostingId
          WHERE (
              lower(coalesce(j.title, ${fallbackPostingField("title", "h.jobUrl")}, '')) LIKE ?
           OR lower(coalesce(j.company, ${fallbackPostingField("company", "h.jobUrl")}, '')) LIKE ?
           OR lower(coalesce(h.summary, '')) LIKE ?
           OR lower(coalesce(h.reasons, '')) LIKE ?
           OR lower(coalesce(h.jobUrl, '')) LIKE ?
          )
          ${buildFilterClause(filterClauses)}
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
        score: number | null;
        status: string;
        decision: string | null;
        title: string | null;
        company: string | null;
      }>;

      results.push(
        ...rows.map((row) => ({
          id: row.id,
          collection: "reviews" as const,
          title: row.title ?? "Unknown title",
          subtitle: row.company ? `${row.company} • ${row.source}` : row.source,
          body: row.summary,
          createdAt: row.createdAt,
          primaryUrl: row.jobUrl,
          secondaryUrl: `/reviews`,
          secondaryLabel: "Open review history",
          score: row.score,
          status: row.status,
          decision: row.decision,
        })),
      );
    }

    if (collections.includes("decisions")) {
      const filterClauses = filters.map((filter) => {
        switch (filter) {
          case "applied":
            return `d.decision = 'APPLY'`;
          case "incomplete":
            return `EXISTS (
              SELECT 1
              FROM JobReviewHistory h
              WHERE h.jobPostingId = d.jobPostingId
                AND h.decision = 'APPLY'
                AND h.status != 'SUBMITTED'
            )`;
          case "skipped":
            return `d.decision = 'SKIP'`;
          case "error":
            return `d.policyAllowed = 0`;
          case "pending":
            return `d.decision = 'MAYBE'`;
        }
      });

      const rows = db
        .prepare(
          `
          SELECT
            d.id,
            d.decision,
            d.score,
            d.policyAllowed,
            d.createdAt,
            j.url AS jobUrl,
            j.title,
            j.company
          FROM ApplicationDecision d
          INNER JOIN JobPosting j ON j.id = d.jobPostingId
          WHERE (
              lower(coalesce(j.title, '')) LIKE ?
           OR lower(coalesce(j.company, '')) LIKE ?
           OR lower(coalesce(d.reasons, '')) LIKE ?
           OR lower(coalesce(j.url, '')) LIKE ?
           OR lower(coalesce(d.id, '')) LIKE ?
          )
          ${buildFilterClause(filterClauses)}
          ORDER BY d.createdAt DESC
          LIMIT ?
          `,
        )
        .all(term, term, term, term, term, limitPerCollection) as Array<{
        id: string;
        decision: string;
        score: number;
        policyAllowed: number;
        createdAt: string | null;
        jobUrl: string;
        title: string | null;
        company: string | null;
      }>;

      results.push(
        ...rows.map((row) => ({
          id: row.id,
          collection: "decisions" as const,
          title: row.title ?? "Unknown title",
          subtitle: `${row.company ?? "Unknown company"} • ${row.decision} • ${row.score}`,
          body: `Decision ID: ${row.id}`,
          createdAt: row.createdAt,
          primaryUrl: row.jobUrl,
          secondaryUrl: `/decisions?decisionId=${encodeURIComponent(row.id)}`,
          secondaryLabel: "Open decision detail",
          score: row.score,
          decision: row.decision,
          status: row.policyAllowed ? "policy-allowed" : "policy-blocked",
        })),
      );
    }

    if (collections.includes("companies")) {
      const filterClauses = filters.map((filter) => {
        switch (filter) {
          case "applied":
            return `appliedJobs > 0`;
          case "incomplete":
            return `EXISTS (
              SELECT 1
              FROM JobPosting j
              INNER JOIN JobReviewHistory h ON h.jobPostingId = j.id OR h.jobUrl = j.url
              WHERE j.firmId = Firm.id
                AND h.decision = 'APPLY'
                AND h.status != 'SUBMITTED'
            )`;
          case "skipped":
            return `skippedJobs > 0`;
          case "error":
            return `EXISTS (
              SELECT 1
              FROM JobPosting j
              INNER JOIN SystemLog l ON l.jobPostingId = j.id OR l.jobUrl = j.url
              WHERE j.firmId = Firm.id
                AND l.level = 'ERROR'
            )`;
          case "pending":
            return `EXISTS (
              SELECT 1
              FROM JobPosting j
              INNER JOIN JobReviewHistory h ON h.jobPostingId = j.id OR h.jobUrl = j.url
              WHERE j.firmId = Firm.id
                AND h.status IN ('VIEWED', 'EVALUATED', 'READY_TO_SUBMIT')
            )`;
        }
      });

      const rows = db
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
          WHERE (
              lower(coalesce(name, '')) LIKE ?
           OR lower(coalesce(linkedinUrl, '')) LIKE ?
          )
          ${buildFilterClause(filterClauses)}
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
        ...rows.map((row) => ({
          id: row.id,
          collection: "companies" as const,
          title: row.name,
          subtitle: `${row.totalReviewedJobs} reviewed • ${row.appliedJobs} apply • ${row.skippedJobs} skip`,
          body: row.linkedinUrl,
          createdAt: row.updatedAt,
          primaryUrl: row.linkedinUrl,
          secondaryUrl: `/companies`,
          secondaryLabel: "Open companies view",
          score: row.appliedJobs,
          decision: row.appliedJobs > 0 ? "APPLY" : row.skippedJobs > 0 ? "SKIP" : null,
        })),
      );
    }

    if (collections.includes("answers")) {
      const filterClauses = filters.map((filter) => {
        switch (filter) {
          case "applied":
            return `EXISTS (
              SELECT 1
              FROM JobReviewHistory h
              WHERE h.jobPostingId = p.jobPostingId
                AND (h.decision = 'APPLY' OR h.status = 'SUBMITTED')
            )`;
          case "incomplete":
            return `EXISTS (
              SELECT 1
              FROM JobReviewHistory h
              WHERE h.jobPostingId = p.jobPostingId
                AND h.decision = 'APPLY'
                AND h.status != 'SUBMITTED'
            )`;
          case "skipped":
            return `EXISTS (
              SELECT 1
              FROM JobReviewHistory h
              WHERE h.jobPostingId = p.jobPostingId
                AND (h.decision = 'SKIP' OR h.status LIKE 'SKIPPED%')
            )`;
          case "error":
            return `EXISTS (
              SELECT 1
              FROM JobReviewHistory h
              WHERE h.jobPostingId = p.jobPostingId
                AND h.status = 'FAILED'
            )`;
          case "pending":
            return `EXISTS (
              SELECT 1
              FROM JobReviewHistory h
              WHERE h.jobPostingId = p.jobPostingId
                AND h.status IN ('VIEWED', 'EVALUATED', 'READY_TO_SUBMIT')
            )`;
        }
      });

      const rows = db
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
          WHERE (
              lower(coalesce(j.title, '')) LIKE ?
           OR lower(coalesce(j.company, '')) LIKE ?
           OR lower(coalesce(p.questionsJson, '')) LIKE ?
          )
          ${buildFilterClause(filterClauses)}
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
        ...rows.map((row) => ({
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
    }

    if (collections.includes("answer-cache") && filters.length === 0) {
      const rows = db
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
        ...rows.map((row) => ({
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
    }

    if (collections.includes("logs")) {
      const filterClauses = filters.map((filter) => {
        switch (filter) {
          case "applied":
            return `(lower(coalesce(message, '')) LIKE '%submitted%' OR lower(coalesce(message, '')) LIKE '%apply%')`;
          case "incomplete":
            return `(
              lower(coalesce(message, '')) LIKE '%stopped before completion%'
              OR lower(coalesce(message, '')) LIKE '%ready_to_submit%'
              OR lower(coalesce(message, '')) LIKE '%final submit step%'
              OR lower(coalesce(message, '')) LIKE '%external handoff%'
              OR lower(coalesce(message, '')) LIKE '%incomplete%'
            )`;
          case "skipped":
            return `lower(coalesce(message, '')) LIKE '%skip%'`;
          case "error":
            return `level = 'ERROR'`;
          case "pending":
            return `(level = 'WARN' OR lower(coalesce(message, '')) LIKE '%retry%')`;
        }
      });

      const rows = db
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
          WHERE (
              lower(coalesce(message, '')) LIKE ?
           OR lower(coalesce(scope, '')) LIKE ?
           OR lower(coalesce(runType, '')) LIKE ?
           OR lower(coalesce(jobUrl, '')) LIKE ?
          )
          ${buildFilterClause(filterClauses)}
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
        ...rows.map((row) => ({
          id: row.id,
          collection: "logs" as const,
          title: `${row.level} • ${row.scope}`,
          subtitle: row.runType,
          body: row.message,
          createdAt: row.createdAt,
          primaryUrl: row.jobUrl,
          secondaryUrl: `/`,
          secondaryLabel: "Open overview",
          level: row.level,
          status: row.level,
        })),
      );
    }

    return results.sort((left, right) => compareSearchResults(sort, left, right));
  } finally {
    db.close();
  }
}
