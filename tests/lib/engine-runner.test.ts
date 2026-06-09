import { EventEmitter } from "node:events";
import { describe, expect, it, vi, beforeEach } from "vitest";

const spawnMock = vi.fn();
const spawnSyncMock = vi.fn();

vi.mock("node:child_process", () => ({
  spawn: spawnMock,
  spawnSync: spawnSyncMock,
}));

vi.mock("@/lib/engine-paths", () => ({
  getEngineRoot: () => "C:\\engine",
  getEngineDbPath: () => "C:\\engine\\prisma\\dev.db",
  getEngineArtifactsPath: () => "C:\\engine\\artifacts",
}));

vi.mock("@/lib/run-progress", () => ({
  readRunProgress: () => ({
    evaluatedCount: 0,
    skippedCount: 0,
    submittedCount: 0,
    failedCount: 0,
    applyDecisionCount: 0,
    currentActivity: null,
    latestArtifact: null,
    reviews: [],
  }),
}));

function fakeChild() {
  const child = new EventEmitter() as EventEmitter & {
    stdout: EventEmitter;
    stderr: EventEmitter;
    pid: number;
    kill: () => void;
  };
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.pid = 123;
  child.kill = vi.fn();
  return child;
}

describe("engine runner", () => {
  beforeEach(() => {
    vi.resetModules();
    spawnMock.mockReset();
    spawnSyncMock.mockReset();
    delete (globalThis as unknown as Record<string, unknown>).__jobToolDashboardRunManager;
  });

  it("spawns the engine npm dev command in ENGINE_ROOT", async () => {
    const child = fakeChild();
    spawnMock.mockReturnValue(child);
    const { startEngineRun, getCurrentRun } = await import("@/lib/engine-runner");

    const run = startEngineRun(["apply-batch", "https://example.com", "--count", "1"]);

    expect(run.status).toBe("running");
    expect(spawnMock).toHaveBeenCalledWith(
      process.platform === "win32" ? "npm.cmd" : "npm",
      ["run", "dev", "--", "apply-batch", "https://example.com", "--count", "1"],
      expect.objectContaining({ cwd: "C:\\engine" }),
    );
    expect(getCurrentRun()?.pid).toBe(123);
  });

  it("stops the Windows process tree for an active run", async () => {
    const child = fakeChild();
    spawnMock.mockReturnValue(child);
    spawnSyncMock.mockReturnValue({ status: 0 });
    const { startEngineRun, stopCurrentRun, getCurrentRun } = await import("@/lib/engine-runner");

    startEngineRun(["apply-batch", "https://example.com", "--count", "1"]);
    const stopped = stopCurrentRun();

    expect(stopped?.status).toBe("stopped");
    if (process.platform === "win32") {
      expect(spawnSyncMock).toHaveBeenCalledWith(
        "taskkill.exe",
        ["/pid", "123", "/T", "/F"],
        expect.objectContaining({ windowsHide: true }),
      );
    } else {
      expect(child.kill).toHaveBeenCalled();
    }
    expect(getCurrentRun()?.status).toBe("stopped");
  });
});
