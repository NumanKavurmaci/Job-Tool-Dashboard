import { describe, expect, it } from "vitest";
import nextConfig from "@/next.config";

describe("Next.js security configuration", () => {
  it("disables the framework signature", () => {
    expect(nextConfig.poweredByHeader).toBe(false);
  });

  it("applies browser hardening headers to every route", async () => {
    expect(nextConfig.headers).toBeTypeOf("function");
    const groups = await nextConfig.headers?.();
    expect(groups).toHaveLength(1);
    expect(groups?.[0]?.source).toBe("/(.*)");

    const headers = new Map(groups?.[0]?.headers.map(({ key, value }) => [key, value]));
    expect(headers.get("Content-Security-Policy")).toContain("default-src 'self'");
    expect(headers.get("Content-Security-Policy")).toContain("object-src 'none'");
    expect(headers.get("Content-Security-Policy")).toContain("frame-ancestors 'none'");
    expect(headers.get("Content-Security-Policy")).toContain("form-action 'self'");
    expect(headers.get("Cross-Origin-Opener-Policy")).toBe("same-origin");
    expect(headers.get("Permissions-Policy")).toBe("camera=(), microphone=(), geolocation=()");
    expect(headers.get("Referrer-Policy")).toBe("no-referrer");
    expect(headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(headers.get("X-Frame-Options")).toBe("DENY");
  });
});
