import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { getEngineArtifactsPath, getEngineDbPath, getEngineLogPath, getEngineRoot } from "./engine-paths";

export type EngineStatusCheck = {
  key: string;
  label: string;
  ok: boolean;
  detail: string;
};

export type EngineConfigStatus = {
  engineRoot: string;
  llmProvider: "openai" | "local" | null;
  localLlmBaseUrl: string | null;
  checks: EngineStatusCheck[];
  ready: boolean;
};

function configuredValue(env: Record<string, string>, key: string): string | null {
  const value = env[key]?.trim();
  if (!value || (key === "OPENAI_API_KEY" && /^your[_-]?key[_-]?here$/i.test(value))) {
    return null;
  }
  return value;
}

function resolveLlmProvider(env: Record<string, string>): "openai" | "local" | null {
  const configured = configuredValue(env, "LLM_PROVIDER");
  if (configured === "openai" || configured === "local") {
    return configured;
  }
  if (configured) {
    return null;
  }

  return configuredValue(env, "LOCAL_LLM_BASE_URL") && configuredValue(env, "LOCAL_LLM_MODEL")
    ? "local"
    : "openai";
}

function readEngineEnv(): Record<string, string> {
  const envPath = path.join(getEngineRoot(), ".env");
  if (!existsSync(envPath)) {
    return {};
  }

  const entries: Record<string, string> = {};
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");
    if (separator <= 0) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    const rawValue = trimmed.slice(separator + 1).trim();
    entries[key] = rawValue.replace(/^["']|["']$/g, "");
  }

  return entries;
}

function findResumeCandidate(): string | null {
  const userDir = path.join(getEngineRoot(), "user");
  if (!existsSync(userDir)) {
    return null;
  }

  const match = readdirSync(userDir)
    .filter((entry) => /\.(pdf|docx|md|txt)$/i.test(entry))
    .sort((left, right) => {
      const score = (entry: string) => {
        const lower = entry.toLowerCase();
        return (lower.includes("resume") || lower.includes("cv") ? 10 : 0) + (entry.endsWith(".pdf") ? 5 : 0);
      };
      return score(right) - score(left) || left.localeCompare(right);
    })[0];

  return match ? path.join(userDir, match) : null;
}

async function checkLocalLlm(baseUrl: string | null): Promise<EngineStatusCheck> {
  if (!baseUrl) {
    return {
      key: "llm",
      label: "LM Studio",
      ok: false,
      detail: "LOCAL_LLM_BASE_URL is not configured.",
    };
  }

  const normalized = baseUrl.replace(/\/$/, "");
  try {
    const response = await fetch(`${normalized}/models`, {
      signal: AbortSignal.timeout(2500),
    });

    return {
      key: "llm",
      label: "LM Studio",
      ok: response.ok,
      detail: response.ok ? `Online at ${normalized}` : `Responded with HTTP ${response.status}.`,
    };
  } catch {
    return {
      key: "llm",
      label: "LM Studio",
      ok: false,
      detail: `Not reachable at ${normalized}.`,
    };
  }
}

async function checkLlmProvider(
  env: Record<string, string>,
  provider: "openai" | "local" | null,
  localLlmBaseUrl: string | null,
): Promise<EngineStatusCheck> {
  if (!provider) {
    return {
      key: "llm",
      label: "LLM provider",
      ok: false,
      detail: "LLM_PROVIDER must be openai or local.",
    };
  }

  if (provider === "openai") {
    const apiKey = configuredValue(env, "OPENAI_API_KEY");
    return {
      key: "llm",
      label: "OpenAI",
      ok: Boolean(apiKey),
      detail: apiKey
        ? `Configured for ${configuredValue(env, "OPENAI_MODEL") ?? "gpt-4.1-mini"}.`
        : "OPENAI_API_KEY is not configured.",
    };
  }

  if (!configuredValue(env, "LOCAL_LLM_MODEL")) {
    return {
      key: "llm",
      label: "LM Studio",
      ok: false,
      detail: "LOCAL_LLM_MODEL is not configured.",
    };
  }

  return checkLocalLlm(localLlmBaseUrl);
}

export async function readEngineConfigStatus(): Promise<EngineConfigStatus> {
  const engineRoot = getEngineRoot();
  const env = readEngineEnv();
  const llmProvider = resolveLlmProvider(env);
  const localLlmBaseUrl = llmProvider === "local"
    ? configuredValue(env, "LOCAL_LLM_BASE_URL")
    : null;
  const packagePath = path.join(engineRoot, "package.json");
  const sessionPath = path.join(engineRoot, env.LINKEDIN_SESSION_STATE_PATH ?? ".auth/linkedin-session.json");
  const profilePath = path.join(engineRoot, env.LINKEDIN_BROWSER_PROFILE_PATH ?? ".auth/linkedin-profile");
  const resume = findResumeCandidate();

  const checks: EngineStatusCheck[] = [
    {
      key: "engineRoot",
      label: "Engine folder",
      ok: existsSync(engineRoot),
      detail: engineRoot,
    },
    {
      key: "package",
      label: "Engine package",
      ok: existsSync(packagePath),
      detail: packagePath,
    },
    {
      key: "database",
      label: "Database",
      ok: existsSync(getEngineDbPath()),
      detail: getEngineDbPath(),
    },
    {
      key: "logs",
      label: "Log file",
      ok: existsSync(getEngineLogPath()),
      detail: getEngineLogPath(),
    },
    {
      key: "artifacts",
      label: "Artifacts",
      ok: existsSync(getEngineArtifactsPath()),
      detail: getEngineArtifactsPath(),
    },
    {
      key: "resume",
      label: "Resume",
      ok: Boolean(resume),
      detail: resume ?? "No resume-like file found under engine/user.",
    },
    {
      key: "linkedinSession",
      label: "LinkedIn session",
      ok: existsSync(sessionPath) || existsSync(profilePath),
      detail: existsSync(sessionPath) ? sessionPath : profilePath,
    },
    await checkLlmProvider(env, llmProvider, localLlmBaseUrl),
  ];

  return {
    engineRoot,
    llmProvider,
    localLlmBaseUrl,
    checks,
    ready: checks.every((check) => check.ok),
  };
}
