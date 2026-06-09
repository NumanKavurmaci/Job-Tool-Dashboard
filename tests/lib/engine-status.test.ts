import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
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
      "LOCAL_LLM_BASE_URL=http://127.0.0.1:1234/v1\nLINKEDIN_SESSION_STATE_PATH=.auth/linkedin-session.json\n",
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
  });

  it("reports the engine workspace checks and local LLM status", async () => {
    const { readEngineConfigStatus } = await import("@/lib/engine-status");
    const status = await readEngineConfigStatus();

    expect(status.ready).toBe(true);
    expect(status.engineRoot).toBe(tempDir);
    expect(status.checks.map((check) => check.key)).toContain("database");
    expect(status.checks.find((check) => check.key === "localLlm")).toMatchObject({
      ok: true,
      label: "LM Studio",
    });
  });
});
