import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { getEngineArtifactsPath } from "./engine-paths";

type ParsedArtifactDetails = {
  mode?: string | null;
  status?: string | null;
  stopReason?: string | null;
  finalStage?: string | null;
  durationMs?: number | null;
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
};

export type ArtifactSummary = {
  name: string;
  category: string;
  fullPath: string;
  updatedAt: string;
  size: number;
  preview: string | null;
  details: ParsedArtifactDetails | null;
};

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
  };
}

export function readRecentArtifacts(limit = 12): ArtifactSummary[] {
  const base = getEngineArtifactsPath();
  const categories = ["batch-runs", "easy-apply-runs", "external-apply-runs", "screenshots"];
  const rows: ArtifactSummary[] = [];

  for (const category of categories) {
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

export function readArtifactPreview(summary: ArtifactSummary): string | null {
  return summary.preview;
}
