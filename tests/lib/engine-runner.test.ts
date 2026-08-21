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
    terminalOutcome: null,
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

function fakeChild(pid = 123) {
  const child = new EventEmitter() as EventEmitter & {
    stdout: EventEmitter;
    stderr: EventEmitter;
    pid: number;
    kill: ReturnType<typeof vi.fn>;
  };
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.pid = pid;
  child.kill = vi.fn(() => true);
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
      expect.objectContaining({
        cwd: "C:\\engine",
        env: expect.objectContaining({ JOB_TOOL_RUN_ID: run.id }),
        shell: false,
      }),
    );
    expect(getCurrentRun()?.pid).toBe(123);
    expect(readRunProgressMock).toHaveBeenCalledWith(expect.objectContaining({ runId: run.id }));
  });

  it("keeps a pre-correlation hot-reloaded run on the legacy time fallback", async () => {
    const child = fakeChild(404);
    (globalThis as unknown as Record<string, unknown>).__jobToolDashboardRunManager = {
      emitter: new EventEmitter(),
      current: {
        id: "legacy-run",
        args: ["score", "https://example.com/jobs/1"],
        mode: "score",
        command: "npm score",
        cwd: "C:\\engine",
        startedAt: "2026-08-21T12:00:00.000Z",
        finishedAt: null,
        status: "running",
        exitCode: null,
        pid: 404,
        events: [{
          id: "legacy-event",
          runId: "legacy-run",
          type: "run_started",
          message: "Started score.",
          createdAt: "2026-08-21T12:00:00.000Z",
        }],
      },
      child,
    };

    const { getCurrentRun } = await import("@/lib/engine-runner");
    const run = getCurrentRun();

    expect(run).toMatchObject({ id: "legacy-run", correlationMode: "legacy-time" });
    expect(readRunProgressMock).toHaveBeenCalledWith(expect.objectContaining({
      runId: undefined,
      startedAt: "2026-08-21T12:00:00.000Z",
    }));
  });

  it("tracks two distinct active runs and their child processes independently", async () => {
    const firstChild = fakeChild(101);
    const secondChild = fakeChild(202);
    spawnMock.mockReturnValueOnce(firstChild).mockReturnValueOnce(secondChild);
    const { getRun, getRunRegistryState, startEngineRun } = await import("@/lib/engine-runner");

    const first = startEngineRun([
      "external-apply",
      "https://forms.example.com/application-a",
      "--dry-run",
    ]);
    const second = startEngineRun([
      "external-apply",
      "https://forms.example.com/application-b",
      "--dry-run",
    ]);

    expect(first.id).not.toBe(second.id);
    expect(getRun(first.id)).toMatchObject({ id: first.id, pid: 101, status: "running" });
    expect(getRun(second.id)).toMatchObject({ id: second.id, pid: 202, status: "running" });
    expect(getRunRegistryState()).toMatchObject({ activeCount: 2, maxActive: 2, available: 0 });
    expect(spawnMock).toHaveBeenCalledTimes(2);
  });

  it("rejects a third active run for capacity without spawning another process", async () => {
    spawnMock.mockReturnValueOnce(fakeChild(101)).mockReturnValueOnce(fakeChild(202));
    const { RunCapacityError, startEngineRun } = await import("@/lib/engine-runner");

    startEngineRun(["external-apply", "https://forms.example.com/application-a", "--dry-run"]);
    startEngineRun(["external-apply", "https://forms.example.com/application-b", "--dry-run"]);

    expect(() =>
      startEngineRun(["external-apply", "https://forms.example.com/application-c", "--dry-run"]),
    ).toThrow(RunCapacityError);
    expect(spawnMock).toHaveBeenCalledTimes(2);
  });

  it("rejects a second run that claims the active LinkedIn browser profile", async () => {
    spawnMock.mockReturnValue(fakeChild(101));
    const { RunResourceConflictError, startEngineRun } = await import("@/lib/engine-runner");

    startEngineRun(["score", "https://www.linkedin.com/jobs/view/123"]);

    expect(() =>
      startEngineRun(["decide", "https://www.linkedin.com/jobs/view/456"]),
    ).toThrow(RunResourceConflictError);
    expect(spawnMock).toHaveBeenCalledTimes(1);
  });

  it("allows LinkedIn and Kariyer runs when they claim different profiles", async () => {
    spawnMock.mockReturnValueOnce(fakeChild(101)).mockReturnValueOnce(fakeChild(202));
    const { getRunRegistryState, startEngineRun } = await import("@/lib/engine-runner");

    const linkedin = startEngineRun(["score", "https://www.linkedin.com/jobs/view/123"]);
    const kariyer = startEngineRun([
      "score",
      "https://www.kariyer.net/is-ilani/acme-backend-developer-4599999",
    ]);

    expect(linkedin.exclusiveResources).toEqual(["profile:linkedin"]);
    expect(kariyer.exclusiveResources).toEqual(["profile:kariyer"]);
    expect(getRunRegistryState().activeCount).toBe(2);
    expect(spawnMock).toHaveBeenCalledTimes(2);
  });

  it("targets stop to one child and keeps the other run active", async () => {
    const firstChild = fakeChild(101);
    const secondChild = fakeChild(202);
    spawnMock.mockReturnValueOnce(firstChild).mockReturnValueOnce(secondChild);
    spawnSyncMock.mockReturnValue({ status: 0 });
    const { getRun, startEngineRun, stopEngineRun } = await import("@/lib/engine-runner");

    const first = startEngineRun([
      "external-apply",
      "https://forms.example.com/application-a",
      "--dry-run",
    ]);
    const second = startEngineRun([
      "external-apply",
      "https://forms.example.com/application-b",
      "--dry-run",
    ]);
    const stopping = stopEngineRun(first.id);

    expect(stopping.status).toBe("stopping");
    if (process.platform === "win32") {
      expect(spawnSyncMock).toHaveBeenCalledWith(
        "taskkill.exe",
        ["/pid", "101", "/T", "/F"],
        expect.objectContaining({ windowsHide: true }),
      );
      expect(spawnSyncMock).not.toHaveBeenCalledWith(
        "taskkill.exe",
        ["/pid", "202", "/T", "/F"],
        expect.anything(),
      );
    } else {
      expect(firstChild.kill).toHaveBeenCalledTimes(1);
      expect(secondChild.kill).not.toHaveBeenCalled();
    }
    expect(getRun(first.id)?.status).toBe("stopping");
    expect(getRun(second.id)?.status).toBe("running");

    firstChild.emit("close", 143);

    expect(getRun(first.id)?.status).toBe("stopped");
    expect(getRun(second.id)?.status).toBe("running");
  });

  it("keeps one run active when the other child closes", async () => {
    const firstChild = fakeChild(101);
    const secondChild = fakeChild(202);
    spawnMock.mockReturnValueOnce(firstChild).mockReturnValueOnce(secondChild);
    const { getRun, getRunRegistryState, startEngineRun } = await import("@/lib/engine-runner");

    const first = startEngineRun(["external-apply", "https://forms.example.com/a", "--dry-run"]);
    const second = startEngineRun(["external-apply", "https://forms.example.com/b", "--dry-run"]);

    firstChild.emit("close", 0);

    expect(getRun(first.id)?.status).toBe("completed");
    expect(getRun(second.id)?.status).toBe("running");
    expect(getRunRegistryState()).toMatchObject({ activeCount: 1, available: 1 });
  });

  it("emits one terminal event even when close and error notifications repeat", async () => {
    const child = fakeChild(101);
    spawnMock.mockReturnValue(child);
    const { getRunEvents, startEngineRun } = await import("@/lib/engine-runner");

    const run = startEngineRun(["external-apply", "https://forms.example.com/a", "--dry-run"]);
    child.emit("close", 0);
    child.emit("close", 0);
    child.emit("error", new Error("late child error"));

    const terminalEvents = (getRunEvents(run.id) ?? []).filter((event) =>
      ["run_finished", "run_failed", "run_stopped"].includes(event.type),
    );
    expect(terminalEvents).toHaveLength(1);
    expect(terminalEvents[0]?.type).toBe("run_finished");
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

  it("keeps process completion while exposing a partial batch terminal outcome", async () => {
    const child = fakeChild();
    spawnMock.mockReturnValue(child);
    readRunProgressMock.mockReturnValue({
      ...progressWithActivity(),
      failedCount: 2,
      terminalOutcome: {
        status: "partial",
        reason: "Two approved jobs stopped before completion.",
      },
    });
    const { startEngineRun, getCurrentRun } = await import("@/lib/engine-runner");

    startEngineRun(["apply-batch", "https://example.com", "--count", "2"]);
    child.emit("close", 0);

    expect(getCurrentRun()).toMatchObject({
      status: "completed",
      progress: {
        terminalOutcome: {
          status: "partial",
          reason: "Two approved jobs stopped before completion.",
        },
        currentActivity: {
          stage: "partial",
          label: "Run completed with partial outcome",
          detail: "Two approved jobs stopped before completion.",
        },
      },
    });
  });

  it("shows stopping activity until the stopped child closes", async () => {
    const child = fakeChild();
    spawnMock.mockReturnValue(child);
    spawnSyncMock.mockReturnValue({ status: 0 });
    const { getRun, startEngineRun, stopEngineRun } = await import("@/lib/engine-runner");

    const started = startEngineRun(["external-apply", "https://forms.example.com/a", "--dry-run"]);
    stopEngineRun(started.id);

    expect(getRun(started.id)).toMatchObject({
      status: "stopping",
      progress: {
        currentActivity: {
          stage: "stopping",
          label: "Stopping run",
        },
      },
    });

    child.emit("close", 143);

    const stopped = getRun(started.id);
    expect(stopped?.status).toBe("stopped");
    expect(stopped?.progress?.currentActivity).toMatchObject({
      stage: "stopped",
      label: "Run stopped",
      jobUrl: "https://www.linkedin.com/jobs/view/123",
    });
    expect(stopped?.progress?.lastObservedActivity).toMatchObject({
      stage: "applying",
      label: "Applying Software Engineer at Acme",
    });
  });
});
