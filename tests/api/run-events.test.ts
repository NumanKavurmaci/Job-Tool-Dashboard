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

  it("replays all retained events when Last-Event-ID is invalid", async () => {
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
    ]);

    const request = new Request("http://127.0.0.1:3000/api/run/run-1/events", {
      headers: { "Last-Event-ID": "not-a-number" },
    });
    const response = await getRunEvents(request, runContext("run-1"));

    expect(await response.text()).toContain("id: 1\nevent: run_started");
  });

  it("streams live events, closes on a terminal event, and unsubscribes", async () => {
    const unsubscribe = vi.fn();
    let listener: ((event: Record<string, unknown>) => void) | undefined;
    getRunMock.mockReturnValue({ id: "run-live", status: "running" });
    getRunEventsMock.mockReturnValue([]);
    subscribeToRunMock.mockImplementation((_id, callback) => {
      listener = callback;
      return unsubscribe;
    });

    const response = await getRunEvents(
      eventsRequest("run-live"),
      runContext("run-live"),
    );
    listener?.({
      id: "event-1",
      sequence: 1,
      runId: "run-live",
      type: "stdout",
      message: "working",
      createdAt: "2026-08-21T10:00:00.000Z",
    });
    listener?.({
      id: "event-2",
      sequence: 2,
      runId: "run-live",
      type: "run_finished",
      message: "done",
      createdAt: "2026-08-21T10:00:01.000Z",
    });
    const body = await response.text();

    expect(subscribeToRunMock).toHaveBeenCalledWith("run-live", expect.any(Function));
    expect(body).toContain("event: connected");
    expect(body).toContain("id: 1\nevent: stdout");
    expect(body).toContain("id: 2\nevent: run_finished");
    expect(unsubscribe).toHaveBeenCalledOnce();
  });

  it("unsubscribes when the client cancels an active stream", async () => {
    const unsubscribe = vi.fn();
    getRunMock.mockReturnValue({ id: "run-live", status: "running" });
    getRunEventsMock.mockReturnValue([]);
    subscribeToRunMock.mockReturnValue(unsubscribe);

    const response = await getRunEvents(
      eventsRequest("run-live"),
      runContext("run-live"),
    );
    const reader = response.body?.getReader();
    await reader?.read();
    await reader?.cancel();

    expect(unsubscribe).toHaveBeenCalledOnce();
  });
});
