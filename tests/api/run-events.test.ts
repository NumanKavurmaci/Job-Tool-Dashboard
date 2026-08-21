import { beforeEach, describe, expect, it, vi } from "vitest";

const { getRunEventsMock, getRunMock, subscribeToRunMock } = vi.hoisted(() => ({
  getRunEventsMock: vi.fn(),
  getRunMock: vi.fn(),
  subscribeToRunMock: vi.fn(),
}));

vi.mock("@/lib/engine-runner", () => ({
  getRun: getRunMock,
  getRunEvents: getRunEventsMock,
  subscribeToRun: subscribeToRunMock,
}));

import { GET as getRunEvents } from "@/app/api/run/[id]/events/route";

function eventsRequest(id: string, lastEventId?: number) {
  return new Request(`http://127.0.0.1:3000/api/run/${id}/events`, {
    headers: lastEventId == null ? {} : { "Last-Event-ID": String(lastEventId) },
  });
}

function runContext(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("run events API route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getRunMock.mockReturnValue(null);
    getRunEventsMock.mockReturnValue(null);
    subscribeToRunMock.mockReturnValue(vi.fn());
  });

  it("returns a typed no-store 404 for an unknown run", async () => {
    const response = await getRunEvents(
      eventsRequest("missing-run"),
      runContext("missing-run"),
    );

    expect(response.status).toBe(404);
    expect(response.headers.get("cache-control")).toContain("no-store");
    await expect(response.json()).resolves.toEqual({
      error: "Engine run was not found.",
      code: "RUN_NOT_FOUND",
    });
    expect(getRunEventsMock).not.toHaveBeenCalled();
    expect(subscribeToRunMock).not.toHaveBeenCalled();
  });

  it("replays only events after Last-Event-ID and emits sequence ids", async () => {
    getRunMock.mockReturnValue({ id: "run-1", status: "completed" });
    getRunEventsMock.mockReturnValue([
      {
        id: "event-1",
        sequence: 1,
        runId: "run-1",
        type: "run_started",
        message: "Started score.",
        createdAt: "2026-08-21T10:00:00.000Z",
      },
      {
        id: "event-2",
        sequence: 2,
        runId: "run-1",
        type: "run_finished",
        message: "Engine run completed.",
        createdAt: "2026-08-21T10:00:01.000Z",
      },
    ]);

    const response = await getRunEvents(
      eventsRequest("run-1", 1),
      runContext("run-1"),
    );
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(body).toContain("event: connected");
    expect(body).toContain("id: 2\nevent: run_finished");
    expect(body).not.toContain("id: 1\n");
    expect(getRunEventsMock).toHaveBeenCalledWith("run-1");
    expect(subscribeToRunMock).not.toHaveBeenCalled();
  });
});
