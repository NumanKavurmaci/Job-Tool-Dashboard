import { describe, expect, it } from "vitest";
import {
  exclusiveResourcesForArgs,
  executionModeForArgs,
} from "@/lib/run-resources";

describe("run resources", () => {
  it.each([
    [["easy-apply", "https://www.linkedin.com/jobs/view/1"], ["profile:linkedin"]],
    [["explore-batch", "https://www.linkedin.com/jobs/collections/easy-apply"], ["profile:linkedin"]],
    [["score", "https://www.linkedin.com/jobs/view/1"], ["profile:linkedin"]],
    [["score", "https://www.kariyer.net/is-ilani/acme-role-1234567"], ["profile:kariyer"]],
    [["external-apply", "https://forms.example.com/application"], []],
  ] as const)("maps %s to its exclusive profile claim", (args, expected) => {
    expect(exclusiveResourcesForArgs([...args])).toEqual(expected);
  });

  it("does not grant a protected profile claim to lookalike hosts", () => {
    expect(
      exclusiveResourcesForArgs([
        "score",
        "https://www.linkedin.com.evil.example/jobs/view/1",
      ]),
    ).toEqual([]);
    expect(
      exclusiveResourcesForArgs([
        "score",
        "https://kariyer.net.evil.example/is-ilani/acme-role-1234567",
      ]),
    ).toEqual([]);
  });

  it("derives an immutable execution mode from the engine arguments", () => {
    expect(executionModeForArgs(["apply-batch", "https://jobs.example.com", "--dry-run"]))
      .toBe("dry-run");
    expect(executionModeForArgs(["apply-batch", "https://jobs.example.com"]))
      .toBe("live");
    expect(executionModeForArgs(["score", "https://jobs.example.com"]))
      .toBe("non-submit");
  });
});
