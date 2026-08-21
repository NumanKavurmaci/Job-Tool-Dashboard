import { lstatSync, readdirSync, readFileSync, realpathSync, statSync } from "node:fs";
import path from "node:path";
import { getEngineArtifactsPath, getEngineRoot } from "./engine-paths";

export type ParsedArtifactDetails = {
  mode?: string | null;
  status?: string | null;
  stopReason?: string | null;
  finalStage?: string | null;
  platform?: string | null;
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
  recovery?: RecoveryMetadata | null;
  unknownActionDiagnostics?: UnknownActionDiagnostics | null;
  outcomeJobs?: {
    recommended: RunOutcomeJob[];
    applied: RunOutcomeJob[];
    incomplete: RunOutcomeJob[];
  };
};

export type RecoveryMetadata = {
  failureReasonCode: string | null;
  retryable: boolean | null;
  missingProfileData: string[];
};

export type UnknownActionDiagnostics = {
  currentUrl: string | null;
  activeElement: {
    tagName: string | null;
    inputType: string | null;
    role: string | null;
    ariaLabel: string | null;
    placeholder: string | null;
    text: string | null;
  } | null;
  visibleButtonLabels: string[];
  modalHtmlSample: string | null;
  overlayTextSample: string | null;
};

export type RunOutcomeJob = {
  url: string;
  title: string | null;
  company: string | null;
  location: string | null;
  platform: string | null;
  score: number | null;
  decision: string | null;
  status: string | null;
  reason: string | null;
  failureReasonCode: string | null;
  retryable: boolean | null;
  missingProfileData: string[];
  unknownActionDiagnostics: UnknownActionDiagnostics | null;
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
export const MAX_ARTIFACT_JSON_BYTES = 2 * 1024 * 1024;
const MAX_ARTIFACT_PREVIEW_CHARS = 1200;
const SENSITIVE_ARTIFACT_KEY = /(?:authorization|cookie|credential|password|secret|session|storage.?state|token|api.?key)/i;

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

function isPathInside(parentPath: string, candidatePath: string): boolean {
  const relative = path.relative(parentPath, candidatePath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function resolveArtifactPath(category: string, name: string): string | null {
  if (!ARTIFACT_CATEGORIES.includes(category)) {
    return null;
  }

  if (
    !name ||
    name === "." ||
    name === ".." ||
    name.includes("\0") ||
    /[\\/]/.test(name) ||
    path.basename(name) !== name
  ) {
    return null;
  }

  try {
    const configuredArtifactsRoot = getEngineArtifactsPath();
    if (lstatSync(configuredArtifactsRoot).isSymbolicLink()) {
      return null;
    }

    const engineRoot = realpathSync(getEngineRoot());
    const artifactsRoot = realpathSync(configuredArtifactsRoot);
    if (!isPathInside(engineRoot, artifactsRoot)) {
      return null;
    }

    const categoryPath = path.join(configuredArtifactsRoot, category);
    if (lstatSync(categoryPath).isSymbolicLink()) {
      return null;
    }

    const categoryRoot = realpathSync(categoryPath);
    if (!isPathInside(artifactsRoot, categoryRoot)) {
      return null;
    }

    const candidatePath = path.resolve(categoryRoot, name);
    if (path.dirname(candidatePath) !== categoryRoot) {
      return null;
    }

    const candidateStat = lstatSync(candidatePath);
    if (!candidateStat.isFile() || candidateStat.isSymbolicLink()) {
      return null;
    }

    const realCandidatePath = realpathSync(candidatePath);
    return isPathInside(categoryRoot, realCandidatePath) ? realCandidatePath : null;
  } catch {
    return null;
  }
}

function redactSensitiveArtifactValues(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(redactSensitiveArtifactValues);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, nestedValue]) => [
      key,
      SENSITIVE_ARTIFACT_KEY.test(key) ? "[REDACTED]" : redactSensitiveArtifactValues(nestedValue),
    ]),
  );
}

function readJsonArtifact(fullPath: string, size: number): unknown | null {
  if (size > MAX_ARTIFACT_JSON_BYTES) {
    return null;
  }

  try {
    return JSON.parse(readFileSync(fullPath, "utf8")) as unknown;
  } catch {
    return null;
  }
}

function buildJsonPreview(payload: unknown): string | null {
  if (payload == null) {
    return null;
  }

  try {
    return JSON.stringify(redactSensitiveArtifactValues(payload)).slice(0, MAX_ARTIFACT_PREVIEW_CHARS);
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

function booleanValue(value: unknown): boolean | null {
  return typeof value === "boolean" ? value : null;
}

function stringArrayValue(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0)
    : [];
}

function objectValue(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : null;
}

function readRecoveryMetadata(
  primaryValue: unknown,
  fallbackValue?: unknown,
): RecoveryMetadata | null {
  const primary = objectValue(primaryValue);
  const fallback = objectValue(fallbackValue);
  const failureReasonCode =
    stringValue(primary?.failureReasonCode) ?? stringValue(fallback?.failureReasonCode);
  const retryable =
    booleanValue(primary?.retryable) ?? booleanValue(fallback?.retryable);
  const primaryMissingProfileData = stringArrayValue(primary?.missingProfileData);
  const missingProfileData = primaryMissingProfileData.length > 0
    ? primaryMissingProfileData
    : stringArrayValue(fallback?.missingProfileData);

  if (!failureReasonCode && retryable == null && missingProfileData.length === 0) {
    return null;
  }

  return {
    failureReasonCode,
    retryable,
    missingProfileData,
  };
}

function readUnknownActionDiagnostics(value: unknown): UnknownActionDiagnostics | null {
  const record = objectValue(value);
  if (!record) {
    return null;
  }

  const activeElementRecord = objectValue(record.activeElement);
  const activeElement = activeElementRecord
    ? {
        tagName: stringValue(activeElementRecord.tagName),
        inputType: stringValue(activeElementRecord.inputType),
        role: stringValue(activeElementRecord.role),
        ariaLabel: stringValue(activeElementRecord.ariaLabel),
        placeholder: stringValue(activeElementRecord.placeholder),
        text: stringValue(activeElementRecord.text),
      }
    : null;
  const diagnostics = {
    currentUrl: stringValue(record.currentUrl),
    activeElement,
    visibleButtonLabels: stringArrayValue(record.visibleButtonLabels),
    modalHtmlSample: stringValue(record.modalHtmlSample),
    overlayTextSample: stringValue(record.overlayTextSample),
  };

  if (
    !diagnostics.currentUrl &&
    !diagnostics.activeElement &&
    diagnostics.visibleButtonLabels.length === 0 &&
    !diagnostics.modalHtmlSample &&
    !diagnostics.overlayTextSample
  ) {
    return null;
  }

  return diagnostics;
}

function readOutcomeJob(value: unknown): RunOutcomeJob | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const evaluation = (record.evaluation ?? null) as Record<string, unknown> | null;
  const diagnostics = (evaluation?.diagnostics ?? null) as Record<string, unknown> | null;
  const result =
    objectValue(record.result) ??
    objectValue(record.application) ??
    null;
  const externalApplication = objectValue(result?.externalApplication);
  const recovery = readRecoveryMetadata(result, externalApplication);
  const url = stringValue(record.url) ?? stringValue(result?.url);
  const status = stringValue(result?.status) ?? stringValue(record.status);
  const isStoppedAttempt = Boolean(status && !["submitted", "ready_to_submit"].includes(status));
  const platform =
    stringValue(externalApplication?.platform) ??
    stringValue(objectValue(result?.discovery)?.platform);

  if (!url) {
    return null;
  }

  return {
    url,
    title: stringValue(diagnostics?.title) ?? stringValue(record.title),
    company: stringValue(diagnostics?.company) ?? stringValue(record.company),
    location: stringValue(diagnostics?.location) ?? stringValue(record.location),
    platform,
    score: numberValue(evaluation?.score),
    decision: stringValue(evaluation?.finalDecision),
    status,
    reason: isStoppedAttempt
      ? stringValue(externalApplication?.stopReason) ??
        stringValue(result?.stopReason) ??
        stringValue(record.error) ??
        stringValue(record.stopReason) ??
        stringValue(evaluation?.reason)
      : stringValue(evaluation?.reason) ??
        stringValue(result?.stopReason) ??
        stringValue(record.error) ??
        stringValue(record.stopReason),
    failureReasonCode: recovery?.failureReasonCode ?? null,
    retryable: recovery?.retryable ?? null,
    missingProfileData: recovery?.missingProfileData ?? [],
    unknownActionDiagnostics: readUnknownActionDiagnostics(
      result?.unknownActionDiagnostics ?? record.unknownActionDiagnostics,
    ),
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
  return Boolean(
    value &&
      typeof value === "object" &&
      ((value as Record<string, unknown>).result || (value as Record<string, unknown>).application),
  );
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

function readBatchRunSummary(batchRecord: Record<string, unknown> | null): string | null {
  if (!batchRecord) {
    return null;
  }

  const stopReason = stringValue(batchRecord.stopReason);
  if (stopReason) {
    return stopReason;
  }

  const evaluatedCount = numberValue(batchRecord.evaluatedCount);
  const attemptedCount = numberValue(batchRecord.attemptedCount);
  const status = stringValue(batchRecord.status);

  if (evaluatedCount == null && attemptedCount == null && !status) {
    return null;
  }

  const segments = ["apply-batch"];
  if (evaluatedCount != null) {
    segments.push(`evaluated ${evaluatedCount} job(s)`);
  }
  if (attemptedCount != null) {
    segments.push(`attempted ${attemptedCount}`);
  }
  if (status) {
    segments.push(`finished ${status}`);
  }

  return segments.join(", ") + ".";
}

function parseArtifactDetails(payload: unknown): ParsedArtifactDetails | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const record = payload as Record<string, unknown>;
  const batchRecord = objectValue(record.applyBatch);
  const resultRecord = objectValue(record.result) ?? batchRecord;
  const easyApplyRecord = (record.easyApply ?? null) as Record<string, unknown> | null;
  const discoveryRecord = (record.discovery ?? null) as Record<string, unknown> | null;
  const fillResultRecord = (record.fillResult ?? null) as Record<string, unknown> | null;
  const metaRecord = (record.meta ?? null) as Record<string, unknown> | null;
  const easyApplyExternalApplication = objectValue(easyApplyRecord?.externalApplication);
  const recovery =
    readRecoveryMetadata(record) ??
    readRecoveryMetadata(easyApplyRecord, easyApplyExternalApplication);
  const unknownActionDiagnostics = readUnknownActionDiagnostics(
    easyApplyRecord?.unknownActionDiagnostics ??
      resultRecord?.unknownActionDiagnostics ??
      record.unknownActionDiagnostics,
  );

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
            : typeof record.status === "string"
              ? (record.status as string)
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
    platform:
      stringValue(record.platform) ??
      stringValue(discoveryRecord?.platform) ??
      stringValue(easyApplyExternalApplication?.platform),
    durationMs:
      typeof metaRecord?.durationMs === "number" ? (metaRecord.durationMs as number) : null,
    timings: normalizeTimings(metaRecord?.timings),
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
        : typeof record.sourceUrl === "string"
          ? (record.sourceUrl as string)
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
    recovery,
    unknownActionDiagnostics,
    runSummary:
      typeof metaRecord?.summary === "string"
        ? (metaRecord.summary as string)
        : readBatchRunSummary(batchRecord),
    outcomeJobs: parseOutcomeJobs(resultRecord),
  };
}

export function readRecentArtifacts(limit = 12): ArtifactSummary[] {
  const candidates: Array<{
    category: string;
    fullPath: string;
    name: string;
    size: number;
    updatedAt: string;
  }> = [];

  for (const category of ARTIFACT_CATEGORIES) {
    try {
      const files = readdirSync(path.join(getEngineArtifactsPath(), category));
      for (const file of files) {
        const fullPath = resolveArtifactPath(category, file);
        if (!fullPath) continue;

        const stat = statSync(fullPath);
        if (!stat.isFile()) continue;

        candidates.push({
          name: file,
          category,
          fullPath,
          updatedAt: stat.mtime.toISOString(),
          size: stat.size,
        });
      }
    } catch {
      continue;
    }
  }

  return candidates
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .slice(0, Math.max(0, limit))
    .map((candidate) => {
      const payload = candidate.name.toLowerCase().endsWith(".json")
        ? readJsonArtifact(candidate.fullPath, candidate.size)
        : null;

      return {
        ...candidate,
        id: buildArtifactId(candidate.category, candidate.name),
        preview: buildJsonPreview(payload),
        details: payload ? parseArtifactDetails(payload) : null,
      };
    });
}

export function readArtifactById(id: string): ArtifactSummary | null {
  const parsed = parseArtifactId(id);
  if (!parsed || !ARTIFACT_CATEGORIES.includes(parsed.category)) {
    return null;
  }

  const fullPath = resolveArtifactPath(parsed.category, parsed.name);
  if (!fullPath) {
    return null;
  }

  try {
    const stat = statSync(fullPath);
    if (!stat.isFile()) {
      return null;
    }

    const payload = parsed.name.toLowerCase().endsWith(".json")
      ? readJsonArtifact(fullPath, stat.size)
      : null;

    return {
      id,
      name: parsed.name,
      category: parsed.category,
      fullPath,
      updatedAt: stat.mtime.toISOString(),
      size: stat.size,
      preview: buildJsonPreview(payload),
      details: payload ? parseArtifactDetails(payload) : null,
    };
  } catch {
    return null;
  }
}

export function readArtifactPreview(summary: ArtifactSummary): string | null {
  return summary.preview;
}
