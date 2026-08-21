import { beforeEach, describe, expect, it, vi } from "vitest";

const { getCurrentRunMock, readEngineConfigStatusMock, startEngineRunMock, stopCurrentRunMock } = vi.hoisted(() => ({
  getCurrentRunMock: vi.fn(),
  readEngineConfigStatusMock: vi.fn(),
  startEngineRunMock: vi.fn(),
  stopCurrentRunMock: vi.fn(),
}));

vi.mock("@/lib/engine-runner", () => ({
  getCurrentRun: getCurrentRunMock,
  startEngineRun: startEngineRunMock,
  stopCurrentRun: stopCurrentRunMock,
}));

vi.mock("@/lib/engine-status", () => ({
  readEngineConfigStatus: readEngineConfigStatusMock,
}));

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

describe("run API routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    readEngineConfigStatusMock.mockResolvedValue({ checks: readyChecks, ready: true });
    startEngineRunMock.mockImplementation((args: string[]) => ({ id: "run-1", args, status: "running" }));
    getCurrentRunMock.mockReturnValue(null);
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

  it("guards stop mutations and marks their responses no-store", async () => {
    const blocked = await stopRun(requestFor("/api/run/stop", undefined, "https://attacker.example"));
    const allowed = await stopRun(requestFor("/api/run/stop"));

    expect(blocked.status).toBe(403);
    expect(allowed.status).toBe(200);
    expect(allowed.headers.get("cache-control")).toContain("no-store");
    expect(stopCurrentRunMock).toHaveBeenCalledTimes(1);
  });
});
