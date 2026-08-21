import { describe, expect, it } from "vitest";
import { getBlockingRunChecks } from "@/lib/run-readiness";

const checks = [
  { key: "engineRoot", label: "Engine folder", ok: true, detail: "ready" },
  { key: "package", label: "Engine package", ok: true, detail: "ready" },
  { key: "resume", label: "Resume", ok: true, detail: "ready" },
  { key: "llm", label: "LLM", ok: true, detail: "ready" },
  { key: "linkedinSession", label: "LinkedIn session", ok: false, detail: "missing" },
];

describe("run readiness", () => {
  it("requires a LinkedIn session only for LinkedIn apply-batch targets", () => {
    expect(
      getBlockingRunChecks("apply-batch", checks, {
        url: "https://www.linkedin.com/jobs/collections/easy-apply",
      }).map((check) => check.key),
    ).toEqual(["linkedinSession"]);

    expect(
      getBlockingRunChecks("apply-batch", checks, {
        url: "https://www.kariyer.net/is-ilanlari/yazilim",
      }),
    ).toEqual([]);
  });

  it("keeps the conservative LinkedIn requirement when no target URL is available", () => {
    expect(getBlockingRunChecks("apply-batch", checks).map((check) => check.key)).toEqual([
      "linkedinSession",
    ]);
  });
});
