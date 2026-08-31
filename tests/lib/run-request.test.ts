import {
  mkdirSync,
  mkdtempSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  parseRunStartPayload,
  RunRequestValidationError,
} from "@/lib/run-request";

const originalEngineRoot = process.env.ENGINE_ROOT;

function expectValidationError(input: unknown, message: string | RegExp) {
  expect(() => parseRunStartPayload(input)).toThrow(RunRequestValidationError);
  expect(() => parseRunStartPayload(input)).toThrow(message);
}

describe("run request validation", () => {
  let engineRoot: string;

  beforeEach(() => {
    engineRoot = mkdtempSync(path.join(os.tmpdir(), "job-tool-dashboard-request-"));
    process.env.ENGINE_ROOT = engineRoot;
    mkdirSync(path.join(engineRoot, "user"), { recursive: true });
    mkdirSync(path.join(engineRoot, "artifacts", "batch-runs"), { recursive: true });
    writeFileSync(path.join(engineRoot, "user", "resume.pdf"), "resume");
    writeFileSync(path.join(engineRoot, "questions.json"), "{}");
    writeFileSync(path.join(engineRoot, "artifacts", "batch-runs", "report.json"), "{}");
  });

  afterEach(() => {
    if (originalEngineRoot === undefined) delete process.env.ENGINE_ROOT;
    else process.env.ENGINE_ROOT = originalEngineRoot;

    const resolved = path.resolve(engineRoot);
    if (resolved.startsWith(path.resolve(os.tmpdir()))) {
      rmSync(resolved, { recursive: true, force: true });
    }
  });

  it.each([null, undefined, [], "score", 42, {}])(
    "rejects a missing or malformed run envelope: %j",
    (input) => {
      expectValidationError(input, "A supported run type is required.");
    },
  );

  it("rejects unsupported run types", () => {
    expectValidationError(
      { type: "shell", values: {} },
      "A supported run type is required.",
    );
  });

  it.each([[], "url", 1, true])("rejects non-object values: %j", (values) => {
    expectValidationError(
      { type: "score", values },
      "Run values must be an object.",
    );
  });

  it("defaults an omitted values object and still enforces required fields", () => {
    expect(parseRunStartPayload({ type: "dashboard" })).toEqual({
      type: "dashboard",
      values: {},
    });
    expectValidationError({ type: "score" }, "Job URL is required.");
  });

  it("rejects fields that do not belong to the selected command", () => {
    expectValidationError(
      { type: "score", values: { url: "https://example.com/job/1", dryRun: true } },
      "Unknown field for score: dryRun.",
    );
  });

  it("trims strings and drops null, undefined, and empty optional values", () => {
    expect(
      parseRunStartPayload({
        type: "external-apply",
        values: {
          url: "  https://jobs.example.com/apply/1  ",
          resumePath: "",
          dryRun: null,
        },
      }),
    ).toEqual({
      type: "external-apply",
      values: { url: "https://jobs.example.com/apply/1" },
    });
  });

  it.each(["true", 1, 0, {}, []])("rejects a non-boolean checkbox: %j", (dryRun) => {
    expectValidationError(
      {
        type: "easy-apply",
        values: { url: "https://www.linkedin.com/jobs/view/1", dryRun },
      },
      "Dry Run must be true or false.",
    );
  });

  it("preserves explicit false checkbox values", () => {
    expect(
      parseRunStartPayload({
        type: "easy-apply",
        values: { url: "https://www.linkedin.com/jobs/view/1", dryRun: false },
      }).values,
    ).toMatchObject({ dryRun: false });
  });

  it.each([0, 101, 1.5, Number.NaN, "5"])(
    "rejects an invalid bounded integer: %j",
    (limit) => {
      expectValidationError(
        { type: "dashboard", values: { limit } },
        "Limit must be an integer between 1 and 100.",
      );
    },
  );

  it.each([1, 50, 100])("accepts a bounded integer at and within its limits: %i", (limit) => {
    expect(parseRunStartPayload({ type: "dashboard", values: { limit } }).values.limit)
      .toBe(limit);
  });

  it("rejects unsupported select values and accepts a declared option", () => {
    expectValidationError(
      {
        type: "score",
        values: { url: "https://example.com/job/1", scoringMode: "remote" },
      },
      "Scoring Mode contains an unsupported option.",
    );

    expect(
      parseRunStartPayload({
        type: "score",
        values: { url: "https://example.com/job/1", scoringMode: "ai" },
      }).values.scoringMode,
    ).toBe("ai");
  });

  it("rejects overlong text and URL values", () => {
    expectValidationError(
      {
        type: "score",
        values: { url: `https://example.com/${"a".repeat(4097)}` },
      },
      "Job URL must be a valid string.",
    );
    expectValidationError(
      {
        type: "score",
        values: { url: `https://example.com/${"a".repeat(2030)}` },
      },
      "url is too long.",
    );
  });

  it.each([
    "not-a-url",
    "http://example.com/job/1",
    "https://user:secret@example.com/job/1",
  ])("rejects invalid, non-HTTPS, or credential-bearing URLs: %s", (url) => {
    expectValidationError(
      { type: "score", values: { url } },
      /valid HTTPS URL|credential-free HTTPS URL/,
    );
  });

  it.each([
    "https://localhost/job/1",
    "https://worker.local/job/1",
    "https://service.internal/job/1",
    "https://10.0.0.1/job/1",
    "https://127.0.0.1/job/1",
    "https://169.254.10.20/job/1",
    "https://172.16.0.1/job/1",
    "https://172.31.255.255/job/1",
    "https://192.168.1.1/job/1",
    "https://[::1]/job/1",
    "https://[fc00::1]/job/1",
    "https://[fd12::1]/job/1",
    "https://[fe80::1]/job/1",
  ])("blocks public-job commands from targeting a private address: %s", (url) => {
    expectValidationError(
      { type: "score", values: { url } },
      "Job and application URLs must not target a local or private address.",
    );
  });

  it.each(["score", "decide", "explore", "external-apply"] as const)(
    "allows a public HTTPS URL for %s",
    (type) => {
      expect(
        parseRunStartPayload({ type, values: { url: "https://jobs.example.com/job/1" } }),
      ).toMatchObject({ type, values: { url: "https://jobs.example.com/job/1" } });
    },
  );

  it.each(["easy-apply", "easy-apply-batch", "apply"] as const)(
    "requires a genuine LinkedIn URL for %s",
    (type) => {
      expectValidationError(
        { type, values: { url: "https://linkedin.com.evil.example/jobs/view/1" } },
        `${type} requires a linkedin.com URL.`,
      );
      expect(
        parseRunStartPayload({
          type,
          values: { url: "https://www.linkedin.com/jobs/view/1" },
        }).values.url,
      ).toBe("https://www.linkedin.com/jobs/view/1");
    },
  );

  it.each([
    "https://www.linkedin.com/jobs/collections/easy-apply",
    "https://www.kariyer.net/is-ilanlari/yazilim",
    "https://reactjobs.io/react-jobs",
    "https://jobs.ashbyhq.com/example",
  ])("accepts an allowlisted apply-batch listing URL: %s", (url) => {
    expect(parseRunStartPayload({ type: "apply-batch", values: { url } }).values.url)
      .toBe(url);
  });

  it.each([
    "https://www.kariyer.net/is-ilani/role-123",
    "https://careers.kariyer.net/is-ilanlari/role",
    "https://www.kariyer.net:444/is-ilanlari/role",
    "https://ashbyhq.com/example",
    "https://reactjobs.io.evil.example/react-jobs",
  ])("rejects a non-canonical apply-batch listing URL: %s", (url) => {
    expectValidationError(
      { type: "apply-batch", values: { url } },
      "apply-batch requires a LinkedIn, Kariyer.net /is-ilanlari, ReactJobs, or Ashby listing URL.",
    );
  });

  it("restricts LinkedIn profile URLs to the real domain", () => {
    expectValidationError(
      {
        type: "build-profile",
        values: {
          resumePath: "./user/resume.pdf",
          linkedinUrl: "https://linkedin.com.evil.example/in/user",
        },
      },
      "LinkedIn URL must use linkedin.com.",
    );
    expect(
      parseRunStartPayload({
        type: "build-profile",
        values: {
          resumePath: "./user/resume.pdf",
          linkedinUrl: "https://linkedin.com/in/user",
        },
      }).values.linkedinUrl,
    ).toBe("https://linkedin.com/in/user");
  });

  it("accepts existing regular files in each field's allowed directory", () => {
    expect(
      parseRunStartPayload({
        type: "answer-questions",
        values: {
          resumePath: "./user/resume.pdf",
          questionsPath: "./questions.json",
        },
      }).values,
    ).toEqual({
      resumePath: "./user/resume.pdf",
      questionsPath: "./questions.json",
    });
    expect(
      parseRunStartPayload({
        type: "resume-incomplete",
        values: { reportPath: "./artifacts/batch-runs/report.json" },
      }).values.reportPath,
    ).toBe("./artifacts/batch-runs/report.json");
  });

  it.each([
    ["build-profile", "resumePath", "../outside.pdf", "must stay inside user"],
    ["build-profile", "resumePath", "./resume.pdf", "must stay inside user"],
    ["resume-incomplete", "reportPath", "./questions.json", "must stay inside artifacts\\batch-runs"],
    ["answer-questions", "questionsPath", "../questions.json", "must stay inside the engine root"],
  ] as const)("blocks path traversal for %s.%s", (type, key, value, message) => {
    const values = type === "answer-questions"
      ? { resumePath: "./user/resume.pdf", [key]: value }
      : { [key]: value };
    expectValidationError({ type, values }, message);
  });

  it("rejects missing files, directories, NUL bytes, and unsupported extensions", () => {
    mkdirSync(path.join(engineRoot, "user", "folder.json"));

    expectValidationError(
      { type: "build-profile", values: { resumePath: "./user/missing.pdf" } },
      "resumePath does not exist.",
    );
    expectValidationError(
      { type: "build-profile", values: { resumePath: "./user/resume.exe" } },
      "resumePath has an unsupported file extension.",
    );
    expectValidationError(
      {
        type: "answer-questions",
        values: {
          resumePath: "./user/resume.pdf",
          questionsPath: "./user/folder.json",
        },
      },
      "questionsPath must reference a regular file, not a symlink.",
    );
    expectValidationError(
      { type: "build-profile", values: { resumePath: "./user/resume.pdf\0.exe" } },
      "resumePath is invalid.",
    );
  });
});
