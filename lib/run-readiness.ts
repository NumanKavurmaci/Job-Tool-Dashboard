import type { EngineStatusCheck } from "./engine-status";
import type { RunScriptType } from "./run-config";

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
): EngineStatusCheck[] {
  const requiredKeys = new Set(REQUIRED_CHECKS_BY_RUN[type]);
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
