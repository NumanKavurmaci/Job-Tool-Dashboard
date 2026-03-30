import { describe, expect, it } from "vitest";
import {
  buildGeneratedRunScript,
  buildRunArgs,
  getRunScriptDefinition,
} from "@/lib/run-config";

describe("run config", () => {
  it("builds single easy-apply args with a dry-run flag", () => {
    expect(
      buildRunArgs("easy-apply", {
        url: "https://www.linkedin.com/jobs/view/4387396184/",
        dryRun: true,
        resumePath: "./user/resume.pdf",
      }),
    ).toEqual([
      "easy-apply",
      "https://www.linkedin.com/jobs/view/4387396184/",
      "--resume",
      "./user/resume.pdf",
      "--dry-run",
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

  it("builds batch args with optional dry-run and AI controls", () => {
    expect(
      buildRunArgs("easy-apply-batch", {
        url: "https://www.linkedin.com/jobs/collections/easy-apply",
        count: 5,
        scoreThreshold: 55,
        disableAiEvaluation: true,
        useAiScoreAdjustment: false,
        dryRun: true,
      }),
    ).toEqual([
      "easy-apply-batch",
      "https://www.linkedin.com/jobs/collections/easy-apply",
      "5",
      "--score-threshold",
      "55",
      "--disable-ai-evaluation",
      "--dry-run",
    ]);
  });

  it("builds external-apply args with a dry-run flag", () => {
    expect(
      buildRunArgs("external-apply", {
        url: "https://company.example/apply/software-engineer",
        resumePath: "./user/resume.pdf",
        dryRun: true,
      }),
    ).toEqual([
      "external-apply",
      "https://company.example/apply/software-engineer",
      "--resume",
      "./user/resume.pdf",
      "--dry-run",
    ]);
  });

  it("throws when required values are missing", () => {
    expect(() => buildRunArgs("score", {})).toThrow("Job URL is required.");
    expect(() => buildRunArgs("easy-apply", {})).toThrow("Job URL is required.");
    expect(() => buildRunArgs("external-apply", {})).toThrow("Application URL is required.");
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
