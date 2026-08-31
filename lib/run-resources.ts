export type RunExecutionMode = "dry-run" | "live" | "non-submit";

const APPLY_MODES = new Set([
  "apply",
  "apply-batch",
  "easy-apply",
  "easy-apply-batch",
  "external-apply",
]);

function providerForUrl(value: string | undefined): "linkedin" | "kariyer" | null {
  if (!value) return null;

  try {
    const hostname = new URL(value).hostname.toLowerCase();
    if (hostname === "linkedin.com" || hostname === "www.linkedin.com") return "linkedin";
    if (hostname === "kariyer.net" || hostname === "www.kariyer.net") return "kariyer";
  } catch {
    return null;
  }

  return null;
}

export function executionModeForArgs(args: string[]): RunExecutionMode {
  if (!APPLY_MODES.has(args[0] ?? "")) return "non-submit";
  return args.includes("--dry-run") ? "dry-run" : "live";
}

export function exclusiveResourcesForArgs(args: string[]): string[] {
  const mode = args[0] ?? "";
  if (mode === "easy-apply" || mode === "easy-apply-batch" || mode === "explore-batch") {
    return ["profile:linkedin"];
  }

  if (["score", "decide", "explore", "apply", "apply-batch"].includes(mode)) {
    const provider = providerForUrl(args[1]);
    return provider ? [`profile:${provider}`] : [];
  }

  return [];
}
