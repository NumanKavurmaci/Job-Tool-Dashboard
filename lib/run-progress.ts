import Database from "better-sqlite3";
import { closeSync, openSync, readFileSync, readSync, readdirSync, statSync } from "node:fs";
import path from "node:path";
import { buildArtifactId, readArtifactById, type RunOutcomeJob } from "./engine-artifacts";
import { getEngineArtifactsPath, getEngineDbPath, getEngineLogPath } from "./engine-paths";

export type RunProgressReview = {
  createdAt: string;
  jobUrl: string;
  status: string;
  score: number | null;
  threshold: number | null;
  decision: string | null;
  policyAllowed: number | null;
  summary: string | null;
  title: string | null;
  company: string | null;
  location: string | null;
  applicationType?: "easy_apply" | "external" | null;
  externalApplyUrl?: string | null;
};

type RunProgressReviewRow = Omit<RunProgressReview, "createdAt"> & {
  createdAt: string | number;
  detailsJson: string | null;
};

export type RunProgressSummary = {
  evaluatedCount: number;
  skippedCount: number;
  submittedCount: number;
  failedCount: number;
  applyDecisionCount: number;
  currentActivity: RunCurrentActivity | null;
  lastObservedActivity?: RunCurrentActivity | null;
  terminalOutcome: {
    status: "success" | "partial" | "failed";
    reason: string | null;
  } | null;
  latestArtifact: {
    name: string;
    fullPath: string;
    updatedAt: string;
    size: number;
  } | null;
  reviews: RunProgressReview[];
};

export type RunCurrentActivity = {
  stage: "starting" | "scanning" | "evaluating" | "applying" | "submitted" | "partial" | "failed" | "completed" | "stopping" | "stopped";
  label: string;
  detail: string | null;
  jobUrl: string | null;
  title: string | null;
  company: string | null;
  location: string | null;
  score: number | null;
  decision: string | null;
  updatedAt: string;
};

function openDb(): Database.Database {
  return new Database(getEngineDbPath(), { readonly: true, fileMustExist: true });
}

function sourceForMode(mode?: string): string | null {
  if (!mode) {
    return null;
  }

  if (mode === "apply" || mode === "apply-batch") {
    return "apply-batch";
  }

  if (mode === "easy-apply" || mode === "easy-apply-batch") {
    return mode.includes("batch") ? "easy-apply-batch" : "easy-apply";
  }

  if (mode === "explore-batch") {
    return "explore-batch";
  }

  return mode;
}

export function readRunProgress(args: {
  startedAt: string;
  finishedAt?: string | null;
  runId?: string;
  mode?: string;
  limit?: number;
}): RunProgressSummary {
  const startedAtMs = Date.parse(args.startedAt);
  const finishedAtMs = args.finishedAt ? Date.parse(args.finishedAt) : null;
  const db = openDb();
  try {
    const source = sourceForMode(args.mode);
    const params: Array<string | number> = [Number.isFinite(startedAtMs) ? startedAtMs : args.startedAt];
    const finishedSql = finishedAtMs !== null && Number.isFinite(finishedAtMs)
      ? "AND h.createdAt <= ?"
      : "";
    if (finishedSql) {
      params.push(finishedAtMs as number);
    }
    const sourceSql = source ? "AND h.source = ?" : "";
    if (source) {
      params.push(source);
    }
    const runIdSql = args.runId
      ? "AND CASE WHEN json_valid(h.detailsJson) THEN json_extract(h.detailsJson, '$.dashboardRunId') ELSE NULL END = ?"
      : "";
    if (args.runId) {
      params.push(args.runId);
    }

    const rows = db
      .prepare(
        `
        SELECT
          h.createdAt,
          h.jobUrl,
          h.status,
          h.score,
          h.threshold,
          h.decision,
          h.policyAllowed,
          h.summary,
          h.detailsJson,
          COALESCE(j.title, (
            SELECT jp.title FROM JobPosting jp WHERE jp.url = h.jobUrl LIMIT 1
          )) AS title,
          COALESCE(j.company, (
            SELECT jp.company FROM JobPosting jp WHERE jp.url = h.jobUrl LIMIT 1
          )) AS company,
          COALESCE(j.location, (
            SELECT jp.location FROM JobPosting jp WHERE jp.url = h.jobUrl LIMIT 1
          )) AS location
        FROM JobReviewHistory h
        LEFT JOIN JobPosting j ON j.id = h.jobPostingId
        WHERE h.createdAt >= ?
        ${finishedSql}
        ${sourceSql}
        ${runIdSql}
        ORDER BY h.createdAt ASC
        LIMIT ?
        `,
      )
      .all(...params, args.limit ?? 200) as RunProgressReviewRow[];

    const persistedReviews = collapseReviewOutcomes(
      rows.map(mapReviewRow),
    );
    const latestArtifact = readLatestRunArtifact(args.startedAt, args.finishedAt, args.runId);
    const baseReviews = persistedReviews.length > 0
      ? persistedReviews
      : readArtifactOutcomeReviews(latestArtifact);
    const finishedAtBound = finishedAtMs !== null && Number.isFinite(finishedAtMs) ? finishedAtMs : null;
    const logEntries = readRecentLogEntries(startedAtMs, finishedAtBound, args.runId);
    const reviews = enrichReviewsWithRuntimeSignals(baseReviews, logEntries);
    const terminalOutcome = readArtifactTerminalOutcome(latestArtifact);

    const uniqueReviewedJobs = new Set(reviews.map((review) => review.jobUrl));
    return {
      evaluatedCount: uniqueReviewedJobs.size,
      skippedCount: reviews.filter((review) => review.status.startsWith("SKIPPED")).length,
      submittedCount: reviews.filter((review) => review.status === "SUBMITTED").length,
      failedCount: reviews.filter((review) => review.status === "FAILED").length,
      applyDecisionCount: reviews.filter((review) => review.decision === "APPLY").length,
      currentActivity: inferCurrentActivity({
        startedAtMs,
        entries: logEntries,
        reviews,
      }),
      latestArtifact,
      terminalOutcome,
      reviews,
    };
  } finally {
    db.close();
  }
}

function collapseReviewOutcomes(reviews: RunProgressReview[]): RunProgressReview[] {
  const latestByUrl = new Map<string, RunProgressReview>();
  for (const review of reviews) {
    latestByUrl.set(normalizeJobUrl(review.jobUrl) ?? review.jobUrl, review);
  }

  return [...latestByUrl.values()].sort(
    (left, right) => Date.parse(left.createdAt) - Date.parse(right.createdAt),
  );
}

export function readLatestJobOutcomes(limit = 8): RunProgressReview[] {
  const boundedLimit = Math.max(0, Math.min(limit, 50));
  if (boundedLimit === 0) {
    return [];
  }

  let persistedReviews: RunProgressReview[] = [];
  try {
    const db = openDb();
    try {
      const rows = db.prepare(`
        SELECT
          h.createdAt,
          h.jobUrl,
          h.status,
          h.score,
          h.threshold,
          h.decision,
          h.policyAllowed,
          h.summary,
          h.detailsJson,
          COALESCE(j.title, (
            SELECT jp.title FROM JobPosting jp WHERE jp.url = h.jobUrl LIMIT 1
          )) AS title,
          COALESCE(j.company, (
            SELECT jp.company FROM JobPosting jp WHERE jp.url = h.jobUrl LIMIT 1
          )) AS company,
          COALESCE(j.location, (
            SELECT jp.location FROM JobPosting jp WHERE jp.url = h.jobUrl LIMIT 1
          )) AS location
        FROM JobReviewHistory h
        LEFT JOIN JobPosting j ON j.id = h.jobPostingId
        ORDER BY h.createdAt DESC
        LIMIT ?
      `).all(Math.max(50, boundedLimit * 8)) as RunProgressReviewRow[];
      persistedReviews = rows.map(mapReviewRow);
    } finally {
      db.close();
    }
  } catch {
    // Artifact outcomes still provide a useful fallback if the database is unavailable.
  }

  const combined = [...persistedReviews, ...readMostRecentArtifactOutcomeReviews()]
    .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt));
  const latestByUrl = new Map<string, RunProgressReview>();
  for (const review of combined) {
    const key = normalizeJobUrl(review.jobUrl) ?? review.jobUrl;
    if (!latestByUrl.has(key)) {
      latestByUrl.set(key, review);
    }
  }

  return [...latestByUrl.values()].slice(0, boundedLimit);
}

function readArtifactOutcomeReviews(
  artifact: RunProgressSummary["latestArtifact"],
): RunProgressReview[] {
  if (!artifact) {
    return [];
  }

  const summary = readArtifactById(buildArtifactId("batch-runs", artifact.name));
  const outcomes = summary?.details?.outcomeJobs;
  if (!outcomes) {
    return [];
  }

  const byUrl = new Map<string, RunOutcomeJob>();
  for (const job of [...outcomes.recommended, ...outcomes.incomplete, ...outcomes.applied]) {
    byUrl.set(normalizeJobUrl(job.url) ?? job.url, job);
  }

  return [...byUrl.values()].map((job) => ({
    createdAt: artifact.updatedAt,
    jobUrl: job.url,
    status: (job.status ?? (job.decision === "APPLY" ? "EVALUATED" : "UNKNOWN")).toUpperCase(),
    score: job.score,
    threshold: null,
    decision: job.decision,
    policyAllowed: null,
    summary: job.reason,
    title: job.title,
    company: job.company,
    location: job.location,
    applicationType: job.platform ? "external" : null,
  }));
}

function readArtifactTerminalOutcome(
  artifact: RunProgressSummary["latestArtifact"],
): RunProgressSummary["terminalOutcome"] {
  if (!artifact) {
    return null;
  }

  const details = readArtifactById(buildArtifactId("batch-runs", artifact.name))?.details;
  const status = details?.status?.trim().toLowerCase();
  if (!status) {
    return null;
  }

  if (status === "partial" || status.startsWith("stopped_")) {
    return { status: "partial", reason: details?.stopReason ?? null };
  }
  if (status === "failed" || status === "error") {
    return { status: "failed", reason: details?.stopReason ?? null };
  }
  if (["success", "completed", "submitted"].includes(status)) {
    return { status: "success", reason: details?.stopReason ?? null };
  }

  return null;
}

function readMostRecentArtifactOutcomeReviews(): RunProgressReview[] {
  const batchDir = path.join(getEngineArtifactsPath(), "batch-runs");
  try {
    const candidates = readdirSync(batchDir)
      .filter((name) => name.toLowerCase().endsWith(".json"))
      .map((name) => {
        const fullPath = path.join(batchDir, name);
        const stat = statSync(fullPath);
        return {
          name,
          fullPath,
          updatedAt: stat.mtime.toISOString(),
          size: stat.size,
          modifiedAt: stat.mtimeMs,
        };
      })
      .sort((left, right) => right.modifiedAt - left.modifiedAt)
      .slice(0, 5);

    for (const candidate of candidates) {
      const reviews = readArtifactOutcomeReviews(candidate);
      if (reviews.length > 0) {
        return reviews;
      }
    }
  } catch {
    return [];
  }

  return [];
}

function normalizeCreatedAt(value: string | number): string {
  if (typeof value === "number") {
    return new Date(value).toISOString();
  }

  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : value;
}

function mapReviewRow(row: RunProgressReviewRow): RunProgressReview {
  const { detailsJson, ...review } = row;
  const details = parseJsonObject(detailsJson);
  const diagnostics = objectValue(details?.diagnostics);
  const externalApplication = objectValue(details?.externalApplication);
  const explicitApplicationType = normalizeApplicationType(
    stringValue(details?.applicationType) ?? stringValue(diagnostics?.applicationType),
  );
  const externalApplyUrl =
    stringValue(details?.externalApplyUrl) ?? stringValue(externalApplication?.canonicalUrl);

  return {
    ...review,
    createdAt: normalizeCreatedAt(row.createdAt),
    applicationType:
      explicitApplicationType ?? (externalApplication || externalApplyUrl ? "external" : null),
    externalApplyUrl,
  };
}

function enrichReviewsWithRuntimeSignals(
  reviews: RunProgressReview[],
  entries: Array<Record<string, unknown> & { time: number }>,
): RunProgressReview[] {
  const externalByUrl = new Map<string, string | null>();

  for (const entry of entries) {
    const resultStatus = stringValue(entry.resultStatus);
    const message = stringValue(entry.msg);
    if (
      resultStatus !== "stopped_external_apply" &&
      message !== "Starting LinkedIn external apply handoff." &&
      message !== "LinkedIn external apply handoff finished."
    ) {
      continue;
    }

    const jobUrl = normalizeJobUrl(stringValue(entry.jobUrl) ?? stringValue(entry.url));
    if (!jobUrl) {
      continue;
    }

    externalByUrl.set(
      jobUrl,
      stringValue(entry.externalApplyUrl) ?? stringValue(entry.canonicalUrl),
    );
  }

  return reviews.map((review) => {
    const signal = externalByUrl.get(normalizeJobUrl(review.jobUrl) ?? review.jobUrl);
    if (signal === undefined) {
      return review;
    }

    return {
      ...review,
      applicationType: "external",
      externalApplyUrl: signal ?? review.externalApplyUrl ?? null,
    };
  });
}

function parseJsonObject(value: string | null): Record<string, unknown> | null {
  if (!value) {
    return null;
  }

  try {
    return objectValue(JSON.parse(value));
  } catch {
    return null;
  }
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? value as Record<string, unknown> : null;
}

function normalizeApplicationType(value: string | null): "easy_apply" | "external" | null {
  const normalized = value?.trim().toLowerCase().replace(/[\s-]+/g, "_");
  if (normalized === "easy_apply") {
    return "easy_apply";
  }
  if (normalized === "external" || normalized === "external_apply") {
    return "external";
  }
  return null;
}

function inferCurrentActivity(args: {
  startedAtMs: number;
  entries: Array<Record<string, unknown> & { time: number }>;
  reviews: RunProgressReview[];
}): RunCurrentActivity | null {
  if (!Number.isFinite(args.startedAtMs)) {
    return null;
  }

  const reviewByUrl = new Map(args.reviews.map((review) => [normalizeJobUrl(review.jobUrl), review]));
  let activity: RunCurrentActivity | null = {
    stage: "starting",
    label: "Starting engine",
    detail: "Waiting for the first LinkedIn page or review row.",
    jobUrl: null,
    title: null,
    company: null,
    location: null,
    score: null,
    decision: null,
    updatedAt: new Date(args.startedAtMs).toISOString(),
  };
  let currentJob: Pick<RunCurrentActivity, "jobUrl" | "title" | "company" | "location"> = {
    jobUrl: null,
    title: null,
    company: null,
    location: null,
  };

  for (const entry of args.entries) {
    const updatedAt = new Date(entry.time).toISOString();
    const event = stringValue(entry.event);
    const message = stringValue(entry.msg);
    const url = normalizeJobUrl(stringValue(entry.url) ?? stringValue(entry.jobUrl));

    if (event === "linkedin.auth.state" && url?.includes("/jobs/view/")) {
      const parsed = parseLinkedInTitle(stringValue(entry.title));
      const review = reviewByUrl.get(url);
      currentJob = {
        jobUrl: url,
        title: review?.title ?? parsed.title,
        company: review?.company ?? parsed.company,
        location: review?.location ?? null,
      };
      activity = {
        stage: "scanning",
        label: labelForJob("Scanning", currentJob),
        detail: "LinkedIn job page opened.",
        ...currentJob,
        score: null,
        decision: null,
        updatedAt,
      };
    }

    if (event === "llm.parse.started") {
      activity = {
        stage: "evaluating",
        label: labelForJob("Parsing", currentJob),
        detail: "Reading the job description.",
        ...currentJob,
        score: null,
        decision: null,
        updatedAt,
      };
    }

    if (event === "llm.complete.started") {
      activity = {
        stage: currentJob.jobUrl ? "evaluating" : "starting",
        label: labelForJob("Evaluating", currentJob),
        detail: "Waiting for the local LLM response.",
        ...currentJob,
        score: null,
        decision: null,
        updatedAt,
      };
    }

    if (message === "LinkedIn Easy Apply job evaluated") {
      const review = url ? reviewByUrl.get(url) : null;
      currentJob = {
        jobUrl: url,
        title: review?.title ?? currentJob.title,
        company: review?.company ?? currentJob.company,
        location: review?.location ?? currentJob.location,
      };
      const decision = stringValue(entry.finalDecision);
      const score = numberValue(entry.totalScore);
      activity = {
        stage: decision === "APPLY" ? "applying" : "scanning",
        label: labelForJob(decision === "APPLY" ? "Applying" : "Evaluated", currentJob),
        detail: decision ? `Decision ${decision}${score != null ? `, score ${score}` : ""}.` : "Evaluation finished.",
        ...currentJob,
        score,
        decision,
        updatedAt,
      };
    }

    if (message === "Finished application processing for approved job") {
      const jobUrl = normalizeJobUrl(stringValue(entry.jobUrl));
      const review = jobUrl ? reviewByUrl.get(jobUrl) : null;
      currentJob = {
        jobUrl,
        title: review?.title ?? currentJob.title,
        company: review?.company ?? currentJob.company,
        location: review?.location ?? currentJob.location,
      };
      const resultStatus = stringValue(entry.resultStatus);
      const stage = resultStatus === "submitted" ? "submitted" : "failed";
      activity = {
        stage,
        label: labelForJob(stage === "submitted" ? "Submitted" : "Stopped", currentJob),
        detail: stringValue(entry.stopReason) ?? resultStatus,
        ...currentJob,
        score: review?.score ?? null,
        decision: stringValue(entry.finalDecision) ?? review?.decision ?? null,
        updatedAt,
      };
    }

    if (message === "LinkedIn Apply batch finished") {
      activity = {
        stage: "completed",
        label: "Batch finished",
        detail: stringValue(entry.stopReason),
        jobUrl: null,
        title: null,
        company: null,
        location: null,
        score: null,
        decision: null,
        updatedAt,
      };
    }

    if (event === "linkedin.easy_apply.failed" || event === "cli.failed") {
      activity = {
        stage: "failed",
        label: "Run failed",
        detail: nestedErrorMessage(entry) ?? message,
        ...currentJob,
        score: null,
        decision: null,
        updatedAt,
      };
    }
  }

  return activity;
}

function readRecentLogEntries(
  startedAtMs: number,
  finishedAtMs: number | null,
  runId?: string,
): Array<Record<string, unknown> & { time: number }> {
  const logPath = getEngineLogPath();
  const maxBytes = 512 * 1024;
  let content = "";

  try {
    const stat = statSync(logPath);
    if (stat.size <= maxBytes) {
      content = readFileSync(logPath, "utf8");
    } else {
      const descriptor = openSync(logPath, "r");
      try {
        const buffer = Buffer.alloc(maxBytes);
        readSync(descriptor, buffer, 0, maxBytes, stat.size - maxBytes);
        content = buffer.toString("utf8");
      } finally {
        closeSync(descriptor);
      }
    }
  } catch {
    return [];
  }

  return content
    .split(/\r?\n/)
    .map((line) => {
      try {
        return JSON.parse(line) as Record<string, unknown>;
      } catch {
        return null;
      }
    })
    .filter((entry): entry is Record<string, unknown> & { time: number } => {
      return typeof entry?.time === "number"
        && entry.time >= startedAtMs
        && (finishedAtMs === null || entry.time <= finishedAtMs)
        && (!runId || entry.dashboardRunId === runId);
    })
    .sort((left, right) => left.time - right.time);
}

function parseLinkedInTitle(value: string | null): { title: string | null; company: string | null } {
  if (!value) {
    return { title: null, company: null };
  }

  const parts = value
    .split("|")
    .map((part) => part.trim())
    .filter((part) => part && part.toLowerCase() !== "linkedin");

  return {
    title: parts[0] ?? null,
    company: parts[1] ?? null,
  };
}

function labelForJob(verb: string, job: Pick<RunCurrentActivity, "title" | "company">) {
  if (!job.title && !job.company) {
    return `${verb} current job`;
  }

  return `${verb} ${job.title ?? "role"}${job.company ? ` at ${job.company}` : ""}`;
}

function normalizeJobUrl(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  return value.replace(/[?#].*$/, "").replace(/\/$/, "");
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function nestedErrorMessage(entry: Record<string, unknown>): string | null {
  const error = entry.error;
  if (!error || typeof error !== "object") {
    return null;
  }

  return stringValue((error as Record<string, unknown>).message);
}

function readLatestRunArtifact(
  startedAt: string,
  finishedAt?: string | null,
  runId?: string,
): RunProgressSummary["latestArtifact"] {
  const batchDir = path.join(getEngineArtifactsPath(), "batch-runs");
  const startedAtMs = Date.parse(startedAt);
  const finishedAtMs = finishedAt ? Date.parse(finishedAt) : null;

  try {
    const candidates = readdirSync(batchDir)
      .filter((name) => name.endsWith(".json"))
      .filter((name) => !runId || name.includes(`-${runId}-`))
      .map((name) => {
        const fullPath = path.join(batchDir, name);
        const stat = statSync(fullPath);
        return { name, fullPath, stat };
      })
      .filter((entry) => entry.stat.mtimeMs >= startedAtMs)
      .filter((entry) => finishedAtMs === null || !Number.isFinite(finishedAtMs) || entry.stat.mtimeMs <= finishedAtMs)
      .sort((left, right) => right.stat.mtimeMs - left.stat.mtimeMs);

    const latest = candidates[0];
    if (!latest) {
      return null;
    }

    return {
      name: latest.name,
      fullPath: latest.fullPath,
      updatedAt: latest.stat.mtime.toISOString(),
      size: latest.stat.size,
    };
  } catch {
    return null;
  }
}
