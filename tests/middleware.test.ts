import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { middleware } from "@/middleware";

describe("dashboard host middleware", () => {
  it("allows loopback hosts", () => {
    const response = middleware(
      new NextRequest("http://127.0.0.1:3000/run", {
        headers: { host: "127.0.0.1:3000" },
      }),
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-middleware-next")).toBe("1");
  });

  it.each(["localhost:3000", "localhost.:3000", "[::1]:3000"])(
    "allows the loopback Host variant %s",
    (host) => {
      const response = middleware(
        new NextRequest("http://127.0.0.1:3000/run", { headers: { host } }),
      );

      expect(response.status).toBe(200);
      expect(response.headers.get("x-middleware-next")).toBe("1");
    },
  );

  it("rejects remote and malformed hosts", async () => {
    const remote = middleware(
      new NextRequest("http://dashboard.example/run", {
        headers: { host: "dashboard.example" },
      }),
    );
    const malformed = middleware(
      new NextRequest("http://127.0.0.1:3000/run", {
        headers: { host: "not a host" },
      }),
    );

    expect(remote.status).toBe(403);
    expect(remote.headers.get("cache-control")).toContain("no-store");
    expect(await remote.text()).toContain("limited to this computer");
    expect(malformed.status).toBe(403);
  });

  it("rejects requests with no Host header", async () => {
    const request = new NextRequest("http://127.0.0.1:3000/run");
    request.headers.delete("host");

    const response = middleware(request);

    expect(response.status).toBe(403);
    expect(response.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
});
