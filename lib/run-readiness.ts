import type { EngineStatusCheck } from "./engine-status";
import type { RunFormValues, RunScriptType } from "./run-config";

const REQUIRED_CHECKS_BY_RUN: Record<RunScriptType, string[]> = {
  dashboard: ["engineRoot", "package", "database"],
  score: ["engineRoot", "package", "llm"],
  decide: ["engineRoot", "package", "linkedinSession", "llm"],
  explore: ["engineRoot", "package", "linkedinSession", "llm"],
  "explore-batch": ["engineRoot", "package", "linkedinSession", "llm"],
  "easy-apply": ["engineRoot", "package", "resume", "linkedinSession", "llm"],
  "easy-apply-batch": ["engineRoot", "package", "resume", "linkedinSession", "llm"],
  apply: ["engineRoot", "package", "resume", "linkedinSession", "llm"],
  "apply-batch": ["engineRoot", "package", "resume", "linkedinSession", "llm"],
  "external-apply": ["engineRoot", "package", "resume", "llm"],
  "resume-incomplete": ["engineRoot", "package", "database", "artifacts"],
  "build-profile": ["engineRoot", "package", "resume", "llm"],
  "answer-questions": ["engineRoot", "package", "resume", "llm"],
};

export function getBlockingRunChecks(
  type: RunScriptType,
  checks: EngineStatusCheck[],
  values?: RunFormValues,
): EngineStatusCheck[] {
  const requiredKeys = new Set(REQUIRED_CHECKS_BY_RUN[type]);
  if (type === "apply-batch" && !applyBatchTargetsLinkedIn(values)) {
    requiredKeys.delete("linkedinSession");
  }
  const checksByKey = new Map(checks.map((check) => [check.key, check]));

  return [...requiredKeys]
    .map((key) => checksByKey.get(key) ?? {
      key,
      label: key,
      ok: false,
      detail: "Required readiness check is unavailable.",
    })
    .filter((check) => !check.ok);
}

function applyBatchTargetsLinkedIn(values: RunFormValues | undefined): boolean {
  const rawUrl = values?.url;
  if (typeof rawUrl !== "string" || rawUrl.trim() === "") {
    return true;
  }

  try {
    const hostname = new URL(rawUrl).hostname.toLowerCase();
    return hostname === "linkedin.com" || hostname.endsWith(".linkedin.com");
  } catch {
    return true;
  }
}
