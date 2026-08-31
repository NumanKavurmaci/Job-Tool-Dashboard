import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalEngineRoot = process.env.ENGINE_ROOT;
const originalFetch = global.fetch;

describe("engine status", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(path.join(os.tmpdir(), "job-tool-dashboard-status-"));
    process.env.ENGINE_ROOT = tempDir;
    mkdirSync(path.join(tempDir, "prisma"), { recursive: true });
    mkdirSync(path.join(tempDir, "logs"), { recursive: true });
    mkdirSync(path.join(tempDir, "artifacts"), { recursive: true });
    mkdirSync(path.join(tempDir, "user"), { recursive: true });
    mkdirSync(path.join(tempDir, ".auth"), { recursive: true });
    writeFileSync(path.join(tempDir, "package.json"), "{}");
    writeFileSync(path.join(tempDir, "prisma", "dev.db"), "");
    writeFileSync(path.join(tempDir, "logs", "app.log"), "");
    writeFileSync(path.join(tempDir, "user", "resume.pdf"), "");
    writeFileSync(path.join(tempDir, ".auth", "linkedin-session.json"), "{}");
    writeFileSync(
      path.join(tempDir, ".env"),
      "LLM_PROVIDER=local\nLOCAL_LLM_BASE_URL=http://127.0.0.1:1234/v1\nLOCAL_LLM_MODEL=openai/gpt-oss-20b\nLINKEDIN_SESSION_STATE_PATH=.auth/linkedin-session.json\n",
    );
    global.fetch = vi.fn(async () => new Response("{}", { status: 200 })) as typeof fetch;
  });

  afterEach(() => {
    if (originalEngineRoot === undefined) {
      delete process.env.ENGINE_ROOT;
    } else {
      process.env.ENGINE_ROOT = originalEngineRoot;
    }
    global.fetch = originalFetch;
    vi.resetModules();
    const resolved = path.resolve(tempDir);
    if (resolved.startsWith(path.resolve(os.tmpdir()))) {
      rmSync(resolved, { recursive: true, force: true });
    }
  });

  it("reports the engine workspace checks and local LLM status", async () => {
    const { readEngineConfigStatus } = await import("@/lib/engine-status");
    const status = await readEngineConfigStatus();

    expect(status.ready).toBe(true);
    expect(status.engineRoot).toBe(tempDir);
    expect(status.checks.map((check) => check.key)).toContain("database");
    expect(status.llmProvider).toBe("local");
    expect(status.checks.find((check) => check.key === "llm")).toMatchObject({
      ok: true,
      label: "LM Studio",
    });
  });

  it("accepts configured OpenAI without requiring LM Studio", async () => {
    writeFileSync(
      path.join(tempDir, ".env"),
      "LLM_PROVIDER=openai\nOPENAI_API_KEY=test-key\nOPENAI_MODEL=gpt-4.1-mini\n",
    );

    const { readEngineConfigStatus } = await import("@/lib/engine-status");
    const status = await readEngineConfigStatus();

    expect(status.llmProvider).toBe("openai");
    expect(status.localLlmBaseUrl).toBeNull();
    expect(status.checks.find((check) => check.key === "llm")).toMatchObject({
      ok: true,
      label: "OpenAI",
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("defaults to OpenAI but reports a missing key when no .env exists", async () => {
    rmSync(path.join(tempDir, ".env"));

    const { readEngineConfigStatus } = await import("@/lib/engine-status");
    const status = await readEngineConfigStatus();

    expect(status.llmProvider).toBe("openai");
    expect(status.ready).toBe(false);
    expect(status.checks.find((check) => check.key === "llm")).toEqual({
      key: "llm",
      label: "OpenAI",
      ok: false,
      detail: "OPENAI_API_KEY is not configured.",
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it.each(["your_key_here", "your-key-here"])(
    "does not treat the placeholder OpenAI key %s as configured",
    async (placeholder) => {
      writeFileSync(
        path.join(tempDir, ".env"),
        `# comment\nLLM_PROVIDER = \"openai\"\nINVALID_LINE\nOPENAI_API_KEY='${placeholder}'\n`,
      );

      const { readEngineConfigStatus } = await import("@/lib/engine-status");
      const status = await readEngineConfigStatus();

      expect(status.llmProvider).toBe("openai");
      expect(status.checks.find((check) => check.key === "llm")?.ok).toBe(false);
    },
  );

  it("reports an unsupported explicit LLM provider", async () => {
    writeFileSync(path.join(tempDir, ".env"), "LLM_PROVIDER=remote\nOPENAI_API_KEY=test-key\n");

    const { readEngineConfigStatus } = await import("@/lib/engine-status");
    const status = await readEngineConfigStatus();

    expect(status.llmProvider).toBeNull();
    expect(status.localLlmBaseUrl).toBeNull();
    expect(status.checks.find((check) => check.key === "llm")).toMatchObject({
      label: "LLM provider",
      ok: false,
      detail: "LLM_PROVIDER must be openai or local.",
    });
  });

  it("requires both the local model and base URL before probing LM Studio", async () => {
    writeFileSync(path.join(tempDir, ".env"), "LLM_PROVIDER=local\n");

    const { readEngineConfigStatus } = await import("@/lib/engine-status");
    const missingModel = await readEngineConfigStatus();
    expect(missingModel.checks.find((check) => check.key === "llm")?.detail)
      .toBe("LOCAL_LLM_MODEL is not configured.");
    expect(global.fetch).not.toHaveBeenCalled();

    writeFileSync(
      path.join(tempDir, ".env"),
      "LLM_PROVIDER=local\nLOCAL_LLM_MODEL=model-name\n",
    );
    const missingBaseUrl = await readEngineConfigStatus();
    expect(missingBaseUrl.checks.find((check) => check.key === "llm")?.detail)
      .toBe("LOCAL_LLM_BASE_URL is not configured.");
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("reports a non-success LM Studio response and normalizes a trailing slash", async () => {
    global.fetch = vi.fn(async () => new Response("unavailable", { status: 503 })) as typeof fetch;

    const { readEngineConfigStatus } = await import("@/lib/engine-status");
    const status = await readEngineConfigStatus();

    expect(global.fetch).toHaveBeenCalledWith(
      "http://127.0.0.1:1234/v1/models",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(status.checks.find((check) => check.key === "llm")).toMatchObject({
      ok: false,
      detail: "Responded with HTTP 503.",
    });
  });

  it("reports an unreachable LM Studio without rejecting the status request", async () => {
    global.fetch = vi.fn(async () => {
      throw new Error("connection refused");
    }) as typeof fetch;

    const { readEngineConfigStatus } = await import("@/lib/engine-status");
    const status = await readEngineConfigStatus();

    expect(status.checks.find((check) => check.key === "llm")).toMatchObject({
      ok: false,
      detail: "Not reachable at http://127.0.0.1:1234/v1.",
    });
  });

  it("accepts a persistent browser profile when the session-state file is absent", async () => {
    rmSync(path.join(tempDir, ".auth", "linkedin-session.json"));
    mkdirSync(path.join(tempDir, ".auth", "linkedin-profile"));

    const { readEngineConfigStatus } = await import("@/lib/engine-status");
    const status = await readEngineConfigStatus();

    expect(status.checks.find((check) => check.key === "linkedinSession")).toMatchObject({
      ok: true,
      detail: path.join(tempDir, ".auth", "linkedin-profile"),
    });
  });

  it("reports every missing workspace prerequisite instead of throwing", async () => {
    rmSync(path.join(tempDir, "package.json"));
    rmSync(path.join(tempDir, "prisma", "dev.db"));
    rmSync(path.join(tempDir, "logs", "app.log"));
    rmSync(path.join(tempDir, "artifacts"), { recursive: true });
    rmSync(path.join(tempDir, "user"), { recursive: true });
    rmSync(path.join(tempDir, ".auth", "linkedin-session.json"));

    const { readEngineConfigStatus } = await import("@/lib/engine-status");
    const status = await readEngineConfigStatus();
    const failedKeys = status.checks.filter((check) => !check.ok).map((check) => check.key);

    expect(status.ready).toBe(false);
    expect(failedKeys).toEqual(expect.arrayContaining([
      "package",
      "database",
      "logs",
      "artifacts",
      "resume",
      "linkedinSession",
    ]));
  });
});
