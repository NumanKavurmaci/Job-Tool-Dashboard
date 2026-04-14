import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { getEngineArtifactsPath, getEngineDbPath, getEngineLogPath, getEngineRoot } from "@/lib/engine-paths";

const ORIGINAL_ENGINE_ROOT = process.env.ENGINE_ROOT;

describe("engine paths", () => {
  afterEach(() => {
    if (ORIGINAL_ENGINE_ROOT === undefined) {
      delete process.env.ENGINE_ROOT;
      return;
    }

    process.env.ENGINE_ROOT = ORIGINAL_ENGINE_ROOT;
  });

  it("uses the configured ENGINE_ROOT when present", () => {
    process.env.ENGINE_ROOT = "C:\\workspace\\engine";

    expect(getEngineRoot()).toBe("C:\\workspace\\engine");
    expect(getEngineDbPath()).toBe(path.join("C:\\workspace\\engine", "prisma", "dev.db"));
    expect(getEngineLogPath()).toBe(path.join("C:\\workspace\\engine", "logs", "app.log"));
    expect(getEngineArtifactsPath()).toBe(path.join("C:\\workspace\\engine", "artifacts"));
  });

  it("falls back to the default engine root when env is missing", () => {
    delete process.env.ENGINE_ROOT;

    expect(getEngineRoot()).toBe(path.resolve(process.cwd(), "..", "Job Tool"));
  });

  it("resolves relative ENGINE_ROOT values from the dashboard workspace", () => {
    process.env.ENGINE_ROOT = "../Job Tool";

    expect(getEngineRoot()).toBe(path.resolve(process.cwd(), "..", "Job Tool"));
  });
});
