import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { getEngineArtifactsPath } from "./engine-paths";

export type ParsedArtifactDetails = {
  mode?: string | null;
  status?: string | null;
  stopReason?: string | null;
  finalStage?: string | null;
  durationMs?: number | null;
  timings?: Record<
    string,
    {
      count: number;
      totalMs: number;
      avgMs: number;
      maxMs: number;
    }
  > | null;
  runSummary?: string | null;
  keyEvents?: string[] | null;
  metrics?: Record<string, string | number | boolean | null> | null;
  externalDetectedBy?: string[] | null;
  externalApplyUrl?: string | null;
  precursorPage?: boolean | null;
  precursorSignals?: string[] | null;
  followedPrecursorLink?: string | null;
  siteFeedback?: string[] | null;
  aiCorrectionAttempts?: Array<{
    fieldLabel: string;
    outcome: string;
    validationFeedback: string;
    finalFeedback?: string | null;
  }> | null;
  outcomeJobs?: {
    recommended: RunOutcomeJob[];
    applied: RunOutcomeJob[];
    incomplete: RunOutcomeJob[];
  };
};

export type RunOutcomeJob = {
  url: string;
  title: string | null;
  company: string | null;
  location: string | null;
  score: number | null;
  decision: string | null;
  status: string | null;
  reason: string | null;
};

export type ArtifactSummary = {
  id: string;
  name: string;
  category: string;
  fullPath: string;
  updatedAt: string;
  size: number;
  preview: string | null;
  details: ParsedArtifactDetails | null;
};

const ARTIFACT_CATEGORIES = ["batch-runs", "easy-apply-runs", "external-apply-runs", "screenshots"];

export function buildArtifactId(category: string, name: string): string {
  return `${encodeURIComponent(category)}--${encodeURIComponent(name)}`;
}

function parseArtifactId(id: string): { category: string; name: string } | null {
  const separator = id.indexOf("--");
  if (separator <= 0 || separator >= id.length - 2) {
    return null;
  }

  try {
    return {
      category: decodeURIComponent(id.slice(0, separator)),
      name: decodeURIComponent(id.slice(separator + 2)),
    };
  } catch {
    return null;
  }
}

function readJsonArtifact(fullPath: string): unknown | null {
  try {
    return JSON.parse(readFileSync(fullPath, "utf8")) as unknown;
  } catch {
    return null;
  }
}

function normalizeSiteFeedbackMessages(value: unknown): string[] {
  if (!value || typeof value !== "object") {
    return [];
  }

  const record = value as {
    errors?: unknown;
    warnings?: unknown;
    infos?: unknown;
  };

  return [
    ...(Array.isArray(record.errors) ? record.errors : []),
    ...(Array.isArray(record.warnings) ? record.warnings : []),
    ...(Array.isArray(record.infos) ? record.infos : []),
  ].filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0);
}

function normalizeTimings(value: unknown): ParsedArtifactDetails["timings"] {
  if (!value || typeof value !== "object") {
    return null;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .map(([name, timing]) => {
      if (!timing || typeof timing !== "object") {
        return null;
      }

      const record = timing as Record<string, unknown>;
      const count = typeof record.count === "number" ? record.count : null;
      const totalMs = typeof record.totalMs === "number" ? record.totalMs : null;
      const avgMs = typeof record.avgMs === "number" ? record.avgMs : null;
      const maxMs = typeof record.maxMs === "number" ? record.maxMs : null;

      if (count == null || totalMs == null || avgMs == null || maxMs == null) {
        return null;
      }

      return [name, { count, totalMs, avgMs, maxMs }] as const;
    })
    .filter((entry): entry is readonly [
      string,
      { count: number; totalMs: number; avgMs: number; maxMs: number },
    ] => entry !== null);

  return entries.length > 0 ? Object.fromEntries(entries) : null;
}

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function readOutcomeJob(value: unknown): RunOutcomeJob | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const evaluation = (record.evaluation ?? null) as Record<string, unknown> | null;
  const diagnostics = (evaluation?.diagnostics ?? null) as Record<string, unknown> | null;
  const result = (record.result ?? null) as Record<string, unknown> | null;
  const url = stringValue(record.url) ?? stringValue(result?.url);

  if (!url) {
    return null;
  }

  return {
    url,
    title: stringValue(diagnostics?.title),
    company: stringValue(diagnostics?.company),
    location: stringValue(diagnostics?.location),
    score: numberValue(evaluation?.score),
    decision: stringValue(evaluation?.finalDecision),
    status: stringValue(result?.status),
    reason: stringValue(evaluation?.reason) ?? stringValue(result?.stopReason),
  };
}

function isRecommendedJob(value: unknown): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }

  const evaluation = ((value as Record<string, unknown>).evaluation ?? null) as Record<string, unknown> | null;
  return evaluation?.shouldApply === true || evaluation?.finalDecision === "APPLY";
}

function isSubmittedJob(value: unknown): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }

  const result = ((value as Record<string, unknown>).result ?? null) as Record<string, unknown> | null;
  const status = stringValue(result?.status)?.toLowerCase();
  const stopReason = stringValue(result?.stopReason)?.toLowerCase();
  return status === "submitted" || stopReason?.includes("submitted") === true;
}

function hasAttemptResult(value: unknown): boolean {
  return Boolean(value && typeof value === "object" && (value as Record<string, unknown>).result);
}

function parseOutcomeJobs(resultRecord: Record<string, unknown> | null): ParsedArtifactDetails["outcomeJobs"] {
  const jobs = Array.isArray(resultRecord?.jobs) ? resultRecord.jobs : [];
  const readableJobs = jobs
    .map((job) => ({ raw: job, item: readOutcomeJob(job) }))
    .filter((entry): entry is { raw: unknown; item: RunOutcomeJob } => entry.item !== null);

  return {
    recommended: readableJobs
      .filter((entry) => isRecommendedJob(entry.raw))
      .map((entry) => entry.item),
    applied: readableJobs
      .filter((entry) => isSubmittedJob(entry.raw))
      .map((entry) => entry.item),
    incomplete: readableJobs
      .filter((entry) => hasAttemptResult(entry.raw) && !isSubmittedJob(entry.raw))
      .map((entry) => entry.item),
  };
}

function parseArtifactDetails(payload: unknown): ParsedArtifactDetails | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const resultRecord = (record.result ?? null) as Record<string, unknown> | null;
  const easyApplyRecord = (record.easyApply ?? null) as Record<string, unknown> | null;
  const discoveryRecord = (record.discovery ?? null) as Record<string, unknown> | null;
  const fillResultRecord = (record.fillResult ?? null) as Record<string, unknown> | null;
  const metaRecord = (record.meta ?? null) as Record<string, unknown> | null;

  const externalDetectionRecord = (easyApplyRecord?.externalDetection ?? null) as
    | { source?: unknown; signals?: unknown }
    | null;
  const externalDetection = [
    typeof externalDetectionRecord?.source === "string" ? externalDetectionRecord.source : null,
    ...(Array.isArray(externalDetectionRecord?.signals)
      ? externalDetectionRecord.signals.filter((entry): entry is string => typeof entry === "string")
      : []),
  ].filter((entry): entry is string => Boolean(entry));

  const aiCorrectionAttempts = (
    Array.isArray(fillResultRecord?.aiCorrectionAttempts)
      ? fillResultRecord.aiCorrectionAttempts
      : Array.isArray(easyApplyRecord?.steps)
        ? (easyApplyRecord.steps as Array<Record<string, unknown>>)
            .flatMap((step) =>
              Array.isArray(step.questions)
                ? (step.questions as Array<Record<string, unknown>>)
                    .filter((question) => typeof question.aiCorrectionAttempt === "object" && question.aiCorrectionAttempt !== null)
                    .map((question) => ({
                      fieldLabel:
                        typeof (question.question as { label?: unknown } | undefined)?.label === "string"
                          ? (question.question as { label: string }).label
                          : "Unknown field",
                      ...(question.aiCorrectionAttempt as Record<string, unknown>),
                    }))
                : [],
            )
        : []
  )
    .map((attempt) => {
      const recordAttempt = attempt as Record<string, unknown>;
      return {
        fieldLabel:
          typeof recordAttempt.fieldLabel === "string" ? recordAttempt.fieldLabel : "Unknown field",
        outcome: typeof recordAttempt.outcome === "string" ? recordAttempt.outcome : "unknown",
        validationFeedback:
          typeof recordAttempt.validationFeedback === "string"
            ? recordAttempt.validationFeedback
            : "No validation feedback captured.",
        finalFeedback:
          typeof recordAttempt.finalFeedback === "string" ? recordAttempt.finalFeedback : null,
      };
    });

  const siteFeedback = [
    ...normalizeSiteFeedbackMessages(record.siteFeedback),
    ...normalizeSiteFeedbackMessages(easyApplyRecord?.siteFeedback),
    ...normalizeSiteFeedbackMessages(fillResultRecord?.siteFeedback),
  ];

  return {
    mode:
      typeof record.mode === "string"
        ? record.mode
        : typeof resultRecord?.mode === "string"
          ? (resultRecord.mode as string)
          : null,
    status:
      typeof resultRecord?.status === "string"
        ? (resultRecord.status as string)
        : typeof easyApplyRecord?.status === "string"
          ? (easyApplyRecord.status as string)
          : typeof fillResultRecord?.primaryAction === "string"
            ? (fillResultRecord.primaryAction as string)
            : null,
    stopReason:
      typeof resultRecord?.stopReason === "string"
        ? (resultRecord.stopReason as string)
        : typeof easyApplyRecord?.stopReason === "string"
          ? (easyApplyRecord.stopReason as string)
          : typeof record.stopReason === "string"
            ? (record.stopReason as string)
            : null,
    finalStage:
      typeof record.finalStage === "string"
        ? (record.finalStage as string)
        : typeof (easyApplyRecord?.externalApplication as { finalStage?: unknown } | null)?.finalStage === "string"
          ? ((easyApplyRecord?.externalApplication as { finalStage: string }).finalStage)
          : null,
    durationMs:
      typeof metaRecord?.durationMs === "number" ? (metaRecord.durationMs as number) : null,
    timings: normalizeTimings(metaRecord?.timings),
    runSummary:
      typeof metaRecord?.summary === "string" ? (metaRecord.summary as string) : null,
    keyEvents: Array.isArray(metaRecord?.keyEvents)
      ? (metaRecord.keyEvents as unknown[]).filter(
          (entry): entry is string => typeof entry === "string" && entry.trim().length > 0,
        )
      : null,
    metrics:
      metaRecord?.metrics && typeof metaRecord.metrics === "object"
        ? Object.fromEntries(
            Object.entries(metaRecord.metrics as Record<string, unknown>).filter(([, value]) =>
              ["string", "number", "boolean"].includes(typeof value) || value === null,
            ),
          ) as Record<string, string | number | boolean | null>
        : null,
    externalDetectedBy: externalDetection.length > 0 ? externalDetection : null,
    externalApplyUrl:
      typeof easyApplyRecord?.externalApplyUrl === "string"
        ? (easyApplyRecord.externalApplyUrl as string)
        : typeof (easyApplyRecord?.externalApplication as { canonicalUrl?: unknown } | null)?.canonicalUrl === "string"
          ? ((easyApplyRecord?.externalApplication as { canonicalUrl: string }).canonicalUrl)
          : null,
    precursorPage:
      typeof discoveryRecord?.precursorPage === "boolean"
        ? (discoveryRecord.precursorPage as boolean)
        : null,
    precursorSignals: Array.isArray(discoveryRecord?.precursorSignals)
      ? (discoveryRecord.precursorSignals as string[])
      : null,
    followedPrecursorLink:
      typeof discoveryRecord?.followedPrecursorLink === "string"
        ? (discoveryRecord.followedPrecursorLink as string)
        : null,
    siteFeedback: siteFeedback.length > 0 ? [...new Set(siteFeedback)] : null,
    aiCorrectionAttempts: aiCorrectionAttempts.length > 0 ? aiCorrectionAttempts : null,
    outcomeJobs: parseOutcomeJobs(resultRecord),
  };
}

export function readRecentArtifacts(limit = 12): ArtifactSummary[] {
  const base = getEngineArtifactsPath();
  const rows: ArtifactSummary[] = [];

  for (const category of ARTIFACT_CATEGORIES) {
    const dir = path.join(base, category);
    try {
      const files = readdirSync(dir);
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = statSync(fullPath);
        if (!stat.isFile()) continue;

        const payload = file.endsWith(".json") ? readJsonArtifact(fullPath) : null;
        const preview =
          file.endsWith(".json")
            ? (() => {
                try {
                  return readFileSync(fullPath, "utf8").slice(0, 1200);
                } catch {
                  return null;
                }
              })()
            : null;

        rows.push({
          id: buildArtifactId(category, file),
          name: file,
          category,
          fullPath,
          updatedAt: stat.mtime.toISOString(),
          size: stat.size,
          preview,
          details: payload ? parseArtifactDetails(payload) : null,
        });
      }
    } catch {
      continue;
    }
  }

  return rows
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .slice(0, limit);
}

export function readArtifactById(id: string): ArtifactSummary | null {
  const parsed = parseArtifactId(id);
  if (!parsed || !ARTIFACT_CATEGORIES.includes(parsed.category)) {
    return null;
  }

  const fullPath = path.join(getEngineArtifactsPath(), parsed.category, parsed.name);

  try {
    const stat = statSync(fullPath);
    if (!stat.isFile()) {
      return null;
    }

    const payload = parsed.name.endsWith(".json") ? readJsonArtifact(fullPath) : null;
    const preview =
      parsed.name.endsWith(".json")
        ? (() => {
            try {
              return readFileSync(fullPath, "utf8").slice(0, 1200);
            } catch {
              return null;
            }
          })()
        : null;

    return {
      id,
      name: parsed.name,
      category: parsed.category,
      fullPath,
      updatedAt: stat.mtime.toISOString(),
      size: stat.size,
      preview,
      details: payload ? parseArtifactDetails(payload) : null,
    };
  } catch {
    return null;
  }
}

export function readArtifactPreview(summary: ArtifactSummary): string | null {
  return summary.preview;
}
