import { describe, expect, it } from "vitest";
import { buildRunArgs } from "@/lib/run-config";

describe("run config", () => {
  it("builds dry-run batch args with optional AI score adjustment", () => {
    expect(
      buildRunArgs("easy-apply-dry-run", {
        url: "https://www.linkedin.com/jobs/collections/top-applicant",
        count: 100,
        scoreThreshold: 40,
        disableAiEvaluation: false,
        useAiScoreAdjustment: true,
        resumePath: "./user/resume.pdf",
      }),
    ).toEqual([
      "easy-apply-dry-run",
      "https://www.linkedin.com/jobs/collections/top-applicant",
      "100",
      "--score-threshold",
      "40",
      "--resume",
      "./user/resume.pdf",
      "--ai-score-adjustment",
    ]);
  });

  it("builds single-job decide args", () => {
    expect(
      buildRunArgs("decide", {
        url: "https://www.linkedin.com/jobs/view/4389593314/",
        useAiScoreAdjustment: false,
      }),
    ).toEqual([
      "decide",
      "https://www.linkedin.com/jobs/view/4389593314/",
    ]);
  });

  it("throws when required values are missing", () => {
    expect(() => buildRunArgs("score", {})).toThrow("Job URL is required.");
    expect(() =>
      buildRunArgs("answer-questions", {
        resumePath: "./user/resume.pdf",
      }),
    ).toThrow("Questions path is required.");
  });
});
