import { beforeEach, describe, expect, it, vi } from "vitest";

const runnerMocks = vi.hoisted(() => {
  class RunCapacityError extends Error {
    readonly code = "RUN_CAPACITY_FULL";
    readonly maxActive: number;

    constructor(maxActive = 2) {
      super(`At most ${maxActive} engine runs can be active at once.`);
      this.maxActive = maxActive;
    }
  }

  class RunResourceConflictError extends Error {
    readonly code = "RUN_RESOURCE_CONFLICT";
    readonly resources: string[];

    constructor(resources: string[]) {
      super(`Another active run is using: ${resources.join(", ")}.`);
      this.resources = resources;
    }
  }

  class RunNotFoundError extends Error {
    readonly code = "RUN_NOT_FOUND";
    readonly runId: string;

    constructor(runId: string) {
      super("Engine run was not found.");
      this.runId = runId;
    }
  }

  class RunIdRequiredError extends Error {
    readonly code = "RUN_ID_REQUIRED";

    constructor() {
      super("A run id is required when more than one engine run is active.");
    }
  }

  return {
    getCurrentRunMock: vi.fn(),
    getRunMock: vi.fn(),
    getRunRegistryStateMock: vi.fn(),
    readEngineConfigStatusMock: vi.fn(),
    startEngineRunMock: vi.fn(),
    stopCurrentRunMock: vi.fn(),
    stopEngineRunMock: vi.fn(),
    RunCapacityError,
    RunResourceConflictError,
    RunNotFoundError,
    RunIdRequiredError,
  };
});

const {
  getCurrentRunMock,
  getRunMock,
  getRunRegistryStateMock,
  readEngineConfigStatusMock,
  startEngineRunMock,
  stopCurrentRunMock,
  stopEngineRunMock,
  RunCapacityError,
  RunResourceConflictError,
  RunNotFoundError,
  RunIdRequiredError,
} = runnerMocks;

vi.mock("@/lib/engine-runner", () => ({
  getCurrentRun: runnerMocks.getCurrentRunMock,
  getRun: runnerMocks.getRunMock,
  getRunRegistryState: runnerMocks.getRunRegistryStateMock,
  startEngineRun: runnerMocks.startEngineRunMock,
  stopCurrentRun: runnerMocks.stopCurrentRunMock,
  stopEngineRun: runnerMocks.stopEngineRunMock,
  RunCapacityError: runnerMocks.RunCapacityError,
  RunResourceConflictError: runnerMocks.RunResourceConflictError,
  RunNotFoundError: runnerMocks.RunNotFoundError,
  RunIdRequiredError: runnerMocks.RunIdRequiredError,
}));

vi.mock("@/lib/engine-status", () => ({
  readEngineConfigStatus: runnerMocks.readEngineConfigStatusMock,
}));

import { GET as getCurrentRuns } from "@/app/api/run/current/route";
import { POST as stopRunById } from "@/app/api/run/[id]/stop/route";
import { POST as startRun } from "@/app/api/run/start/route";
import { POST as stopRun } from "@/app/api/run/stop/route";

const readyChecks = [
  "engineRoot",
  "package",
  "database",
  "artifacts",
  "resume",
  "linkedinSession",
  "llm",
].map((key) => ({ key, label: key, ok: true, detail: "ready" }));

function requestFor(path: string, body?: unknown, origin = "http://127.0.0.1:3000") {
  return new Request(`http://127.0.0.1:3000${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: origin,
      "Sec-Fetch-Site": origin === "http://127.0.0.1:3000" ? "same-origin" : "cross-site",
    },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

function runContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("run API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    readEngineConfigStatusMock.mockResolvedValue({ checks: readyChecks, ready: true });
    startEngineRunMock.mockImplementation((args: string[]) => ({ id: "run-1", args, status: "running" }));
    getCurrentRunMock.mockReturnValue(null);
    getRunMock.mockReturnValue(null);
    getRunRegistryStateMock.mockReturnValue({
      runs: [],
      activeCount: 0,
      maxActive: 2,
      available: 2,
    });
    stopCurrentRunMock.mockReturnValue(null);
    stopEngineRunMock.mockReturnValue(null);
  });

  it("defaults an API-started apply run to dry-run", async () => {
    const response = await startRun(
      requestFor("/api/run/start", {
        type: "easy-apply",
        values: { url: "https://www.linkedin.com/jobs/view/123/" },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(startEngineRunMock).toHaveBeenCalledWith([
      "easy-apply",
      "https://www.linkedin.com/jobs/view/123/",
      "--dry-run",
    ]);
  });

  it("uses the live path only when the existing dry-run toggle sends false", async () => {
    const response = await startRun(
      requestFor("/api/run/start", {
        type: "easy-apply",
        values: { url: "https://www.linkedin.com/jobs/view/123/", dryRun: false },
      }),
    );

    expect(response.status).toBe(200);
    expect(startEngineRunMock).toHaveBeenCalledWith([
      "easy-apply",
      "https://www.linkedin.com/jobs/view/123/",
    ]);
  });

  it("rejects cross-origin mutations before touching the runner", async () => {
    const response = await startRun(
      requestFor(
        "/api/run/start",
        { type: "easy-apply", values: { url: "https://www.linkedin.com/jobs/view/123/" } },
        "https://attacker.example",
      ),
    );

    expect(response.status).toBe(403);
    expect(startEngineRunMock).not.toHaveBeenCalled();
  });

  it("rejects oversized declared request bodies before parsing them", async () => {
    const response = await startRun(
      new Request("http://127.0.0.1:3000/api/run/start", {
        method: "POST",
        headers: {
          "Content-Length": String(33 * 1024),
          "Content-Type": "application/json",
          Origin: "http://127.0.0.1:3000",
          "Sec-Fetch-Site": "same-origin",
        },
        body: "{}",
      }),
    );

    expect(response.status).toBe(413);
    expect(startEngineRunMock).not.toHaveBeenCalled();
  });

  it("rejects unknown run types, invalid provider URLs, and out-of-range numbers", async () => {
    const unknownType = await startRun(
      requestFor("/api/run/start", { type: "shell", values: {} }),
    );
    const invalidProvider = await startRun(
      requestFor("/api/run/start", {
        type: "easy-apply",
        values: { url: "https://example.com/jobs/123" },
      }),
    );
    const invalidCount = await startRun(
      requestFor("/api/run/start", {
        type: "explore-batch",
        values: {
          url: "https://www.linkedin.com/jobs/collections/easy-apply",
          count: 101,
        },
      }),
    );

    expect(unknownType.status).toBe(400);
    expect(invalidProvider.status).toBe(400);
    expect(invalidCount.status).toBe(400);
    expect(startEngineRunMock).not.toHaveBeenCalled();
  });

  it("allows public Kariyer detail URLs for analysis but blocks private targets", async () => {
    const kariyer = await startRun(
      requestFor("/api/run/start", {
        type: "score",
        values: { url: "https://www.kariyer.net/is-ilani/ornek-rol-1234567" },
      }),
    );
    const privateTarget = await startRun(
      requestFor("/api/run/start", {
        type: "score",
        values: { url: "https://127.0.0.1/internal-job" },
      }),
    );

    expect(kariyer.status).toBe(200);
    expect(startEngineRunMock).toHaveBeenCalledWith([
      "score",
      "https://www.kariyer.net/is-ilani/ornek-rol-1234567",
    ]);
    expect(privateTarget.status).toBe(400);
  });

  it("accepts supported non-LinkedIn apply-batch listing providers", async () => {
    const response = await startRun(
      requestFor("/api/run/start", {
        type: "apply-batch",
        values: { url: "https://jobs.ashbyhq.com/example" },
      }),
    );

    expect(response.status).toBe(200);
    expect(startEngineRunMock).toHaveBeenCalledWith([
      "apply-batch",
      "https://jobs.ashbyhq.com/example",
      "--dry-run",
    ]);
  });

  it("accepts canonical Kariyer listing batches in dry-run and live modes", async () => {
    const url = "https://www.kariyer.net/is-ilanlari/yazilim-gelistirme?sort=date";
    const dryRun = await startRun(
      requestFor("/api/run/start", {
        type: "apply-batch",
        values: { url, count: 4 },
      }),
    );
    const live = await startRun(
      requestFor("/api/run/start", {
        type: "apply-batch",
        values: { url, count: 4, dryRun: false },
      }),
    );

    expect(dryRun.status).toBe(200);
    expect(live.status).toBe(200);
    expect(startEngineRunMock).toHaveBeenNthCalledWith(1, [
      "apply-batch",
      url,
      "--count",
      "4",
      "--dry-run",
    ]);
    expect(startEngineRunMock).toHaveBeenNthCalledWith(2, [
      "apply-batch",
      url,
      "--count",
      "4",
    ]);
  });

  it("rejects non-canonical Kariyer hosts and non-listing paths", async () => {
    for (const url of [
      "https://kariyer.net.evil.example/is-ilanlari/yazilim",
      "https://kurumsal.kariyer.net/is-ilanlari/yazilim",
      "https://www.kariyer.net/is-ilani/yazilim-123456",
    ]) {
      const response = await startRun(
        requestFor("/api/run/start", {
          type: "apply-batch",
          values: { url },
        }),
      );
      expect(response.status).toBe(400);
    }

    expect(startEngineRunMock).not.toHaveBeenCalled();
  });

  it("does not require a LinkedIn session for Kariyer batches but keeps it for LinkedIn", async () => {
    readEngineConfigStatusMock.mockResolvedValue({
      ready: false,
      checks: readyChecks.map((check) =>
        check.key === "linkedinSession" ? { ...check, ok: false, detail: "missing" } : check,
      ),
    });

    const kariyer = await startRun(
      requestFor("/api/run/start", {
        type: "apply-batch",
        values: { url: "https://www.kariyer.net/is-ilanlari/yazilim" },
      }),
    );
    const linkedin = await startRun(
      requestFor("/api/run/start", {
        type: "apply-batch",
        values: { url: "https://www.linkedin.com/jobs/collections/easy-apply" },
      }),
    );

    expect(kariyer.status).toBe(200);
    expect(linkedin.status).toBe(422);
    expect(startEngineRunMock).toHaveBeenCalledTimes(1);
  });

  it("rejects paths that escape the engine root", async () => {
    const response = await startRun(
      requestFor("/api/run/start", {
        type: "build-profile",
        values: { resumePath: "../outside.pdf" },
      }),
    );

    expect(response.status).toBe(400);
    expect(startEngineRunMock).not.toHaveBeenCalled();
  });

  it("returns readiness blockers without starting the engine", async () => {
    readEngineConfigStatusMock.mockResolvedValue({
      ready: false,
      checks: readyChecks.map((check) =>
        check.key === "linkedinSession" ? { ...check, ok: false, detail: "missing" } : check,
      ),
    });

    const response = await startRun(
      requestFor("/api/run/start", {
        type: "easy-apply",
        values: { url: "https://www.linkedin.com/jobs/view/123/" },
      }),
    );
    const payload = await response.json() as { blockers: Array<{ key: string }> };

    expect(response.status).toBe(422);
    expect(payload.blockers.map((blocker) => blocker.key)).toContain("linkedinSession");
    expect(startEngineRunMock).not.toHaveBeenCalled();
  });

  it("keeps the current-run alias while adding the two-run registry state", async () => {
    const primary = { id: "run-1", status: "running" };
    const secondary = { id: "run-2", status: "running" };
    getCurrentRunMock.mockReturnValue(primary);
    getRunRegistryStateMock.mockReturnValue({
      runs: [secondary, primary],
      activeCount: 2,
      maxActive: 2,
      available: 0,
    });

    const response = await getCurrentRuns();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    await expect(response.json()).resolves.toEqual({
      run: primary,
      runs: [secondary, primary],
      activeCount: 2,
      maxActive: 2,
      available: 0,
    });
  });

  it("returns a typed 409 when the run registry is at capacity", async () => {
    startEngineRunMock.mockImplementation(() => {
      throw new RunCapacityError(2);
    });

    const response = await startRun(
      requestFor("/api/run/start", {
        type: "score",
        values: { url: "https://example.com/jobs/123" },
      }),
    );

    expect(response.status).toBe(409);
    expect(response.headers.get("cache-control")).toContain("no-store");
    await expect(response.json()).resolves.toMatchObject({
      code: "RUN_CAPACITY_FULL",
      maxActive: 2,
    });
  });

  it("returns a typed 409 with the conflicting exclusive resources", async () => {
    startEngineRunMock.mockImplementation(() => {
      throw new RunResourceConflictError(["profile:linkedin"]);
    });

    const response = await startRun(
      requestFor("/api/run/start", {
        type: "easy-apply",
        values: { url: "https://www.linkedin.com/jobs/view/123/" },
      }),
    );

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      code: "RUN_RESOURCE_CONFLICT",
      conflicts: ["profile:linkedin"],
    });
  });

  it("guards the legacy stop mutation and preserves its no-id fallback", async () => {
    const blocked = await stopRun(requestFor("/api/run/stop", undefined, "https://attacker.example"));
    const allowed = await stopRun(requestFor("/api/run/stop"));

    expect(blocked.status).toBe(403);
    expect(allowed.status).toBe(200);
    expect(allowed.headers.get("cache-control")).toContain("no-store");
    expect(stopCurrentRunMock).toHaveBeenCalledOnce();
    expect(stopCurrentRunMock).toHaveBeenCalledWith(undefined);
  });

  it("lets the legacy stop route target an optional run id", async () => {
    const response = await stopRun(requestFor("/api/run/stop", { runId: " run-2 " }));

    expect(response.status).toBe(200);
    expect(stopCurrentRunMock).toHaveBeenCalledWith("run-2");
  });

  it("requires a run id when the legacy stop route is ambiguous", async () => {
    stopCurrentRunMock.mockImplementation(() => {
      throw new RunIdRequiredError();
    });

    const response = await stopRun(requestFor("/api/run/stop"));

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toMatchObject({
      code: "RUN_ID_REQUIRED",
    });
  });

  it("stops a specific run through the canonical targeted route", async () => {
    const run = { id: "run-2", status: "stopping" };
    stopEngineRunMock.mockReturnValue(run);
    getRunMock.mockReturnValue(run);

    const response = await stopRunById(
      requestFor("/api/run/run-2/stop"),
      runContext("run-2"),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(stopEngineRunMock).toHaveBeenCalledWith("run-2");
    expect(getRunMock).toHaveBeenCalledWith("run-2");
    await expect(response.json()).resolves.toEqual({ run });
  });

  it("rejects cross-origin targeted stop requests before touching the runner", async () => {
    const response = await stopRunById(
      requestFor("/api/run/run-2/stop", undefined, "https://attacker.example"),
      runContext("run-2"),
    );

    expect(response.status).toBe(403);
    expect(stopEngineRunMock).not.toHaveBeenCalled();
    expect(getRunMock).not.toHaveBeenCalled();
  });

  it("returns a typed 404 when the targeted run does not exist", async () => {
    stopEngineRunMock.mockImplementation(() => {
      throw new RunNotFoundError("missing-run");
    });

    const response = await stopRunById(
      requestFor("/api/run/missing-run/stop"),
      runContext("missing-run"),
    );

    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toContain("no-store");
    await expect(response.json()).resolves.toMatchObject({
      code: "RUN_NOT_FOUND",
    });
  });
});
