import { describe, expect, it } from "vitest";
import {
  guardMutationRequest,
  jsonNoStore,
  NO_STORE_HEADERS,
} from "@/lib/request-security";

function mutationRequest(
  url = "http://127.0.0.1:3000/api/run/start",
  headers: HeadersInit = {},
) {
  return new Request(url, { method: "POST", headers });
}

describe("request security", () => {
  it.each([
    "http://127.0.0.1:3000/api/run/start",
    "http://localhost:3000/api/run/start",
    "http://localhost.:3000/api/run/start",
    "http://[::1]:3000/api/run/start",
  ])("allows mutation URLs on a loopback interface: %s", (url) => {
    expect(guardMutationRequest(mutationRequest(url))).toBeNull();
  });

  it("rejects a mutation URL addressed to a remote interface", async () => {
    const response = guardMutationRequest(
      mutationRequest("https://dashboard.example/api/run/start"),
    );

    expect(response?.status).toBe(403);
    expect(response?.headers.get("cache-control")).toContain("no-store");
    await expect(response?.json()).resolves.toEqual({
      error: "Dashboard mutations are only available on the loopback interface.",
    });
  });

  it.each(["dashboard.example:3000", "not a host"])(
    "rejects a non-loopback or malformed Host header: %s",
    async (host) => {
      const response = guardMutationRequest(mutationRequest(undefined, { host }));

      expect(response?.status).toBe(403);
      await expect(response?.json()).resolves.toEqual({
        error: "The request Host must resolve to a loopback address.",
      });
    },
  );

  it.each(["127.0.0.1:3000", "localhost:3000", "[::1]:3000"])(
    "accepts an explicit loopback Host header: %s",
    (host) => {
      expect(guardMutationRequest(mutationRequest(undefined, { host }))).toBeNull();
    },
  );

  it("allows an exact same-origin request", () => {
    expect(
      guardMutationRequest(
        mutationRequest(undefined, {
          origin: "http://127.0.0.1:3000",
          "sec-fetch-site": "same-origin",
        }),
      ),
    ).toBeNull();
  });

  it("rejects a valid but different Origin before a mutation", async () => {
    const response = guardMutationRequest(
      mutationRequest(undefined, { origin: "http://localhost:3000" }),
    );

    expect(response?.status).toBe(403);
    await expect(response?.json()).resolves.toEqual({
      error: "Cross-origin dashboard mutations are not allowed.",
    });
  });

  it("rejects a malformed Origin", async () => {
    const response = guardMutationRequest(
      mutationRequest(undefined, { origin: "not an origin" }),
    );

    expect(response?.status).toBe(403);
    await expect(response?.json()).resolves.toEqual({
      error: "The request Origin is invalid.",
    });
  });

  it.each(["cross-site", "same-site"])(
    "rejects Sec-Fetch-Site=%s",
    async (fetchSite) => {
      const response = guardMutationRequest(
        mutationRequest(undefined, { "sec-fetch-site": fetchSite }),
      );

      expect(response?.status).toBe(403);
      await expect(response?.json()).resolves.toEqual({
        error: "Cross-site dashboard mutations are not allowed.",
      });
    },
  );

  it.each(["same-origin", "none"])("allows Sec-Fetch-Site=%s", (fetchSite) => {
    expect(
      guardMutationRequest(mutationRequest(undefined, { "sec-fetch-site": fetchSite })),
    ).toBeNull();
  });

  it("adds no-store headers without losing caller headers or status", async () => {
    const response = jsonNoStore(
      { ok: true },
      { status: 202, headers: { "X-Test-Request": "preserved" } },
    );

    expect(response.status).toBe(202);
    expect(response.headers.get("x-test-request")).toBe("preserved");
    expect(response.headers.get("cache-control")).toBe(NO_STORE_HEADERS["Cache-Control"]);
    expect(response.headers.get("pragma")).toBe(NO_STORE_HEADERS.Pragma);
    expect(response.headers.get("content-type")).toContain("application/json");
    await expect(response.json()).resolves.toEqual({ ok: true });
  });
});
