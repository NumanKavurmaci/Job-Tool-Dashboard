import { beforeEach, describe, expect, it, vi } from "vitest";

const { readEngineConfigStatusMock } = vi.hoisted(() => ({
  readEngineConfigStatusMock: vi.fn(),
}));

vi.mock("@/lib/engine-status", () => ({
  readEngineConfigStatus: readEngineConfigStatusMock,
}));

import { GET } from "@/app/api/config/status/route";

describe("config status API route", () => {
  beforeEach(() => {
    readEngineConfigStatusMock.mockReset();
  });

  it("returns the complete engine status with no-store headers", async () => {
    const status = {
      engineRoot: "C:\\engine",
      llmProvider: "local",
      localLlmBaseUrl: "http://127.0.0.1:1234/v1",
      ready: false,
      checks: [{ key: "resume", label: "Resume", ok: false, detail: "missing" }],
    };
    readEngineConfigStatusMock.mockResolvedValue(status);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("pragma")).toBe("no-cache");
    await expect(response.json()).resolves.toEqual(status);
  });

  it("does not hide a status-reader failure from the framework", async () => {
    readEngineConfigStatusMock.mockRejectedValue(new Error("engine status unavailable"));

    await expect(GET()).rejects.toThrow("engine status unavailable");
  });
});
