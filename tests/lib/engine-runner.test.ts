import { EventEmitter } from "node:events";
import { describe, expect, it, vi, beforeEach } from "vitest";

const spawnMock = vi.fn();
const spawnSyncMock = vi.fn();
const readRunProgressMock = vi.fn();

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
  readRunProgress: readRunProgressMock,
}));

function progressWithActivity(stage: "applying" | "submitted" = "applying") {
  return {
    evaluatedCount: 0,
    skippedCount: 0,
    submittedCount: 0,
    failedCount: 0,
    applyDecisionCount: 0,
    currentActivity: {
      stage,
      label: stage === "applying" ? "Applying Software Engineer at Acme" : "Submitted Software Engineer at Acme",
      detail: "Latest activity inferred from the engine log.",
      jobUrl: "https://www.linkedin.com/jobs/view/123",
      title: "Software Engineer",
      company: "Acme",
      location: "Remote",
      score: 72,
      decision: "APPLY",
      updatedAt: "2026-08-21T12:00:01.000Z",
    },
    latestArtifact: null,
    reviews: [],
  };
}

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
    readRunProgressMock.mockReset();
    readRunProgressMock.mockReturnValue(progressWithActivity());
    delete (globalThis as unknown as Record<string, unknown>).__jobToolDashboardRunManager;
  });

  it("spawns the engine npm dev command in ENGINE_ROOT", async () => {
    const child = fakeChild();
    spawnMock.mockReturnValue(child);
    const { startEngineRun, getCurrentRun } = await import("@/lib/engine-runner");

    const collectionUrl = "https://www.linkedin.com/jobs/search-results/?keywords=software&geoId=102105699";
    const run = startEngineRun(["apply-batch", collectionUrl, "--count", "1"]);

    expect(run.status).toBe("running");
    expect(spawnMock).toHaveBeenCalledWith(
      process.execPath,
      [
        expect.stringMatching(/[\\/]node_modules[\\/]npm[\\/]bin[\\/]npm-cli\.js$/),
        "run",
        "dev",
        "--",
        "apply-batch",
        collectionUrl,
        "--count",
        "1",
      ],
      expect.objectContaining({ cwd: "C:\\engine", shell: false }),
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

  it.each([
    { exitCode: 0, status: "completed", stage: "completed", label: "Run completed" },
    { exitCode: 1, status: "failed", stage: "failed", label: "Run failed" },
  ] as const)(
    "reconciles inferred activity with a $status terminal lifecycle",
    async ({ exitCode, status, stage, label }) => {
      const child = fakeChild();
      spawnMock.mockReturnValue(child);
      const { startEngineRun, getCurrentRun } = await import("@/lib/engine-runner");

      startEngineRun(["apply-batch", "https://example.com", "--count", "1"]);
      child.emit("close", exitCode);

      const run = getCurrentRun();
      expect(run?.status).toBe(status);
      expect(run?.progress?.currentActivity).toMatchObject({ stage, label });
      expect(run?.progress?.currentActivity?.stage).not.toBe("applying");
      expect(run?.progress?.lastObservedActivity).toMatchObject({
        stage: "applying",
        label: "Applying Software Engineer at Acme",
      });
    },
  );

  it("replaces stale applying activity when a run is stopped", async () => {
    const child = fakeChild();
    spawnMock.mockReturnValue(child);
    spawnSyncMock.mockReturnValue({ status: 0 });
    const { startEngineRun, stopCurrentRun, getCurrentRun } = await import("@/lib/engine-runner");

    startEngineRun(["apply-batch", "https://example.com", "--count", "1"]);
    stopCurrentRun();

    const run = getCurrentRun();
    expect(run?.status).toBe("stopped");
    expect(run?.progress?.currentActivity).toMatchObject({
      stage: "stopped",
      label: "Run stopped",
      jobUrl: "https://www.linkedin.com/jobs/view/123",
    });
    expect(run?.progress?.currentActivity?.stage).not.toBe("applying");
    expect(run?.progress?.lastObservedActivity).toMatchObject({
      stage: "applying",
      label: "Applying Software Engineer at Acme",
    });
  });
});
