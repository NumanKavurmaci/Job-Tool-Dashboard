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
        scoringMode: "local",
      }),
    ).toEqual([
      "decide",
      "https://www.linkedin.com/jobs/view/4389593314/",
    ]);
  });

  it("builds single-job explore args", () => {
    expect(
      buildRunArgs("explore", {
        url: "https://www.linkedin.com/jobs/view/4389593314/",
        scoringMode: "ai",
      }),
    ).toEqual([
      "explore",
      "https://www.linkedin.com/jobs/view/4389593314/",
      "--scoring",
      "ai",
    ]);
  });

  it("builds dashboard snapshot args", () => {
    expect(
      buildRunArgs("dashboard", {
        limit: 5,
      }),
    ).toEqual(["dashboard", "--limit", "5"]);
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
        scoringMode: "local",
        dryRun: true,
      }),
    ).toEqual([
      "easy-apply-batch",
      "https://www.linkedin.com/jobs/collections/easy-apply",
      "--count",
      "5",
      "--score-threshold",
      "55",
      "--disable-ai-evaluation",
      "--dry-run",
    ]);
  });

  it("builds explore-batch args without any apply-specific flags", () => {
    expect(
      buildRunArgs("explore-batch", {
        url: "https://www.linkedin.com/jobs/collections/easy-apply",
        count: 12,
        scoreThreshold: 50,
        disableAiEvaluation: true,
        scoringMode: "ai",
      }),
    ).toEqual([
      "explore-batch",
      "https://www.linkedin.com/jobs/collections/easy-apply",
      "--count",
      "12",
      "--score-threshold",
      "50",
      "--disable-ai-evaluation",
      "--scoring",
      "ai",
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

  it("builds Kariyer listing batches as live by default and dry-run only when explicit", () => {
    const url = "https://www.kariyer.net/is-ilanlari/yazilim-gelistirme?sort=date";

    expect(buildRunArgs("apply-batch", { url, count: 8 })).toEqual([
      "apply-batch",
      url,
      "--count",
      "8",
    ]);
    expect(buildRunArgs("apply-batch", { url, count: 8, dryRun: true })).toEqual([
      "apply-batch",
      url,
      "--count",
      "8",
      "--dry-run",
    ]);
  });

  it("defaults every apply command to live unless dry-run is explicit", () => {
    expect(
      buildRunArgs("apply", {
        url: "https://www.linkedin.com/jobs/view/123/",
      }),
    ).not.toContain("--dry-run");
    expect(
      buildRunArgs("external-apply", {
        url: "https://jobs.example.com/apply/123",
      }),
    ).not.toContain("--dry-run");
    expect(
      buildRunArgs("easy-apply", {
        url: "https://www.linkedin.com/jobs/view/123/",
        dryRun: true,
      }),
    ).toContain("--dry-run");
  });

  it("rejects out-of-range batch counts and thresholds", () => {
    expect(() =>
      buildRunArgs("apply-batch", {
        url: "https://www.linkedin.com/jobs/collections/easy-apply",
        count: 1001,
      }),
    ).toThrow("Application target must be an integer between 1 and 1000.");
    expect(() =>
      buildRunArgs("explore-batch", {
        url: "https://www.linkedin.com/jobs/collections/easy-apply",
        scoreThreshold: 0,
      }),
    ).toThrow("Score threshold must be an integer between 1 and 100.");
  });

  it("uses AI scoring, live apply, and a 1000-job batch ceiling by default", () => {
    for (const type of ["explore-batch", "explore", "easy-apply-batch", "apply-batch", "decide", "score"] as const) {
      const scoringField = getRunScriptDefinition(type).fields.find((field) => field.key === "scoringMode");
      if (scoringField) expect(scoringField.defaultValue).toBe("ai");
    }

    for (const type of ["easy-apply", "easy-apply-batch", "apply", "apply-batch", "external-apply"] as const) {
      expect(getRunScriptDefinition(type).fields.find((field) => field.key === "dryRun")?.defaultValue).toBe(false);
    }

    for (const type of ["explore-batch", "easy-apply-batch", "apply-batch"] as const) {
      expect(getRunScriptDefinition(type).fields.find((field) => field.key === "count")?.max).toBe(1000);
    }
  });

  it("describes LinkedIn batch count as a successful application target", () => {
    for (const type of ["easy-apply-batch", "apply-batch"] as const) {
      const countField = getRunScriptDefinition(type).fields.find(
        (field) => field.key === "count",
      );
      expect(countField?.label).toBe("Application Target");
      expect(countField?.description).toContain("failed attempts do not consume the target");
    }
  });

  it("does not ship a real LinkedIn job id as a single-run default", () => {
    for (const type of ["explore", "easy-apply", "apply", "decide"] as const) {
      const urlField = getRunScriptDefinition(type).fields.find((field) => field.key === "url");
      expect(urlField?.defaultValue).toBeUndefined();
      expect(urlField?.placeholder).toContain("JOB_ID");
    }
  });

  it("builds resume-incomplete args with an optional batch report path", () => {
    expect(buildRunArgs("resume-incomplete", {})).toEqual([
      "resume-incomplete",
    ]);

    expect(
      buildRunArgs("resume-incomplete", {
        reportPath: "./artifacts/batch-runs/latest-apply-batch.json",
      }),
    ).toEqual([
      "resume-incomplete",
      "--report",
      "./artifacts/batch-runs/latest-apply-batch.json",
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

  it("advertises Kariyer/ReactJobs scoring and Workable external apply examples", () => {
    const scoreDefinition = getRunScriptDefinition("score");
    const externalApplyDefinition = getRunScriptDefinition("external-apply");

    expect(scoreDefinition.description).toContain("ReactJobs");
    expect(scoreDefinition.description).toContain("Kariyer.net");
    expect(scoreDefinition.fields.find((field) => field.key === "url")?.placeholder).toContain(
      "reactjobs.io/react-jobs/",
    );
    expect(externalApplyDefinition.description).toContain("Workable");
    expect(externalApplyDefinition.fields.find((field) => field.key === "url")?.placeholder).toContain(
      "apply.workable.com",
    );
  });

  it("advertises Kariyer listing support on the primary apply batch", () => {
    const definition = getRunScriptDefinition("apply-batch");
    const urlField = definition.fields.find((field) => field.key === "url");

    expect(definition.description).toContain("Kariyer.net");
    expect(urlField?.label).toBe("Listing URL");
    expect(urlField?.placeholder).toContain("kariyer.net/is-ilanlari");
    expect(urlField?.description).toContain("Kariyer.net /is-ilanlari");
  });

  it("builds a PowerShell wrapper with properly quoted JavaScript string args", () => {
    const script = buildGeneratedRunScript([
      "easy-apply-batch",
      "https://www.linkedin.com/jobs/collections/top-applicant",
      "100",
      "--score-threshold",
      "40",
      "--scoring",
      "ai",
    ]);

    expect(script).toContain("await main(['easy-apply-batch', 'https://www.linkedin.com/jobs/collections/top-applicant', '100', '--score-threshold', '40', '--scoring', 'ai'], appDeps);");
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

  it("builds a quoted PowerShell wrapper for resume-incomplete reports", () => {
    const script = buildGeneratedRunScript([
      "resume-incomplete",
      "--report",
      "C:\\Job Tool\\artifacts\\batch-runs\\latest-apply-batch.json",
    ]);

    expect(script).toContain(
      "await main(['resume-incomplete', '--report', 'C:\\\\Job Tool\\\\artifacts\\\\batch-runs\\\\latest-apply-batch.json'], appDeps);",
    );
  });
});
