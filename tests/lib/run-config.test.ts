import { describe, expect, it } from "vitest";
import {
  buildGeneratedRunScript,
  buildRunArgs,
  getRunScriptDefinition,
} from "@/lib/run-config";

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

  it("builds build-profile and answer-questions args with optional linkedin", () => {
    expect(
      buildRunArgs("build-profile", {
        resumePath: "./user/resume.pdf",
        linkedinUrl: "https://linkedin.com/in/numan",
      }),
    ).toEqual([
      "build-profile",
      "--resume",
      "./user/resume.pdf",
      "--linkedin",
      "https://linkedin.com/in/numan",
    ]);

    expect(
      buildRunArgs("answer-questions", {
        resumePath: "./user/resume.pdf",
        questionsPath: "./questions.json",
        linkedinUrl: "https://linkedin.com/in/numan",
      }),
    ).toEqual([
      "answer-questions",
      "--resume",
      "./user/resume.pdf",
      "--questions",
      "./questions.json",
      "--linkedin",
      "https://linkedin.com/in/numan",
    ]);
  });

  it("builds live batch args with disable-ai-evaluation", () => {
    expect(
      buildRunArgs("easy-apply-batch", {
        url: "https://www.linkedin.com/jobs/collections/easy-apply",
        count: 5,
        scoreThreshold: 55,
        disableAiEvaluation: true,
        useAiScoreAdjustment: false,
      }),
    ).toEqual([
      "easy-apply-batch",
      "https://www.linkedin.com/jobs/collections/easy-apply",
      "5",
      "--score-threshold",
      "55",
      "--disable-ai-evaluation",
    ]);
  });

  it("throws when required values are missing", () => {
    expect(() => buildRunArgs("score", {})).toThrow("Job URL is required.");
    expect(() => buildRunArgs("build-profile", {})).toThrow("Resume path is required.");
    expect(() =>
      buildRunArgs("answer-questions", {
        resumePath: "./user/resume.pdf",
      }),
    ).toThrow("Questions path is required.");
  });

  it("returns script definitions and throws for unsupported script types", () => {
    expect(getRunScriptDefinition("score").label).toBe("Score");
    expect(() => getRunScriptDefinition("score-nope" as never)).toThrow(
      "Unsupported run script type: score-nope",
    );
  });

  it("builds a PowerShell wrapper with properly quoted JavaScript string args", () => {
    const script = buildGeneratedRunScript([
      "easy-apply-batch",
      "https://www.linkedin.com/jobs/collections/top-applicant",
      "100",
      "--score-threshold",
      "40",
      "--ai-score-adjustment",
    ]);

    expect(script).toContain("await main(['easy-apply-batch', 'https://www.linkedin.com/jobs/collections/top-applicant', '100', '--score-threshold', '40', '--ai-score-adjustment'], appDeps);");
    expect(script).not.toContain("await main([easy-apply-batch");
  });

  it("escapes single quotes and backslashes inside generated args", () => {
    const script = buildGeneratedRunScript([
      "build-profile",
      "--resume",
      "C:\\Users\\numan\\O'Reilly\\resume.pdf",
    ]);

    expect(script).toContain("'C:\\\\Users\\\\numan\\\\O\\'Reilly\\\\resume.pdf'");
  });
});
