import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  MAX_ARTIFACT_JSON_BYTES,
  buildArtifactId,
  readArtifactById,
  readArtifactPreview,
  readRecentArtifacts,
} from "@/lib/engine-artifacts";

describe("engine artifacts", () => {
  let tempRoot: string;
  const originalEngineRoot = process.env.ENGINE_ROOT;

  beforeEach(() => {
    tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "job-tool-dashboard-artifacts-"));
    process.env.ENGINE_ROOT = tempRoot;
    fs.mkdirSync(path.join(tempRoot, "artifacts", "batch-runs"), { recursive: true });
    fs.mkdirSync(path.join(tempRoot, "artifacts", "screenshots"), { recursive: true });
  });

  afterEach(() => {
    fs.rmSync(tempRoot, { recursive: true, force: true });
    if (originalEngineRoot === undefined) {
      delete process.env.ENGINE_ROOT;
      return;
    }

    process.env.ENGINE_ROOT = originalEngineRoot;
  });

  it("reads and sorts recent artifacts across known categories", () => {
    const olderPath = path.join(tempRoot, "artifacts", "batch-runs", "older.json");
    const newerPath = path.join(tempRoot, "artifacts", "screenshots", "newer.png");

    fs.writeFileSync(olderPath, JSON.stringify({ ok: true }));
    fs.writeFileSync(newerPath, "png");

    const now = new Date();
    const older = new Date(now.getTime() - 60_000);
    fs.utimesSync(olderPath, older, older);
    fs.utimesSync(newerPath, now, now);

    const artifacts = readRecentArtifacts(10);

    expect(artifacts).toHaveLength(2);
    expect(artifacts[0]?.name).toBe("newer.png");
    expect(artifacts[0]?.id).toBe(buildArtifactId("screenshots", "newer.png"));
    expect(artifacts[0]?.category).toBe("screenshots");
    expect(artifacts[1]?.name).toBe("older.json");
    expect(artifacts[1]?.category).toBe("batch-runs");
  });

  it("returns a JSON preview only for json artifacts", () => {
    const jsonPath = path.join(tempRoot, "artifacts", "batch-runs", "report.json");
    const pngPath = path.join(tempRoot, "artifacts", "screenshots", "snap.png");

    fs.writeFileSync(jsonPath, JSON.stringify({ decision: "SKIP", score: 42 }));
    fs.writeFileSync(pngPath, "png");

    const artifacts = readRecentArtifacts(10);
    const jsonArtifact = artifacts.find((artifact) => artifact.name === "report.json");
    const pngArtifact = artifacts.find((artifact) => artifact.name === "snap.png");

    expect(jsonArtifact && readArtifactPreview(jsonArtifact)).toContain('"decision":"SKIP"');
    expect(pngArtifact && readArtifactPreview(pngArtifact)).toBeNull();
  });

  it("parses run timing summaries from artifact metadata", () => {
    const jsonPath = path.join(tempRoot, "artifacts", "batch-runs", "timed.json");

    fs.writeFileSync(
      jsonPath,
      JSON.stringify({
        result: {
          jobs: [
            {
              url: "https://www.linkedin.com/jobs/view/1",
              evaluation: {
                shouldApply: true,
                finalDecision: "APPLY",
                score: 88,
                reason: "Strong match.",
                diagnostics: {
                  title: "Backend Engineer",
                  company: "Acme",
                  location: "Remote",
                },
              },
              result: {
                status: "submitted",
                stopReason: "Application submitted successfully.",
              },
            },
            {
              url: "https://www.linkedin.com/jobs/view/2",
              evaluation: {
                shouldApply: true,
                finalDecision: "APPLY",
                score: 72,
                reason: "Good match.",
                diagnostics: {
                  title: "Frontend Engineer",
                  company: "Beta",
                  location: "Hybrid",
                },
              },
              result: {
                status: "failed",
                stopReason: "Validation blocked submission.",
              },
            },
          ],
        },
        meta: {
          durationMs: 1234,
          timings: {
            "job.evaluate": {
              count: 2,
              totalMs: 900,
              avgMs: 450,
              maxMs: 700,
            },
            invalid: {
              count: "nope",
            },
          },
        },
      }),
    );

    const artifacts = readRecentArtifacts(10);
    const timedArtifact = artifacts.find((artifact) => artifact.name === "timed.json");

    expect(timedArtifact?.details?.durationMs).toBe(1234);
    expect(timedArtifact?.details?.timings).toEqual({
      "job.evaluate": {
        count: 2,
        totalMs: 900,
        avgMs: 450,
        maxMs: 700,
      },
    });
    expect(timedArtifact?.details?.outcomeJobs).toEqual({
      recommended: [
        {
          url: "https://www.linkedin.com/jobs/view/1",
          title: "Backend Engineer",
          company: "Acme",
          location: "Remote",
          platform: null,
          score: 88,
          decision: "APPLY",
          status: "submitted",
          reason: "Strong match.",
          failureReasonCode: null,
          retryable: null,
          missingProfileData: [],
          unknownActionDiagnostics: null,
        },
        {
          url: "https://www.linkedin.com/jobs/view/2",
          title: "Frontend Engineer",
          company: "Beta",
          location: "Hybrid",
          platform: null,
          score: 72,
          decision: "APPLY",
          status: "failed",
          reason: "Validation blocked submission.",
          failureReasonCode: null,
          retryable: null,
          missingProfileData: [],
          unknownActionDiagnostics: null,
        },
      ],
      applied: [
        {
          url: "https://www.linkedin.com/jobs/view/1",
          title: "Backend Engineer",
          company: "Acme",
          location: "Remote",
          platform: null,
          score: 88,
          decision: "APPLY",
          status: "submitted",
          reason: "Strong match.",
          failureReasonCode: null,
          retryable: null,
          missingProfileData: [],
          unknownActionDiagnostics: null,
        },
      ],
      incomplete: [
        {
          url: "https://www.linkedin.com/jobs/view/2",
          title: "Frontend Engineer",
          company: "Beta",
          location: "Hybrid",
          platform: null,
          score: 72,
          decision: "APPLY",
          status: "failed",
          reason: "Validation blocked submission.",
          failureReasonCode: null,
          retryable: null,
          missingProfileData: [],
          unknownActionDiagnostics: null,
        },
      ],
    });
  });

  it("parses standalone external-apply artifacts using the live top-level shape", () => {
    const reportPath = path.join(tempRoot, "artifacts", "external-apply-runs", "external-live.json");
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(
      reportPath,
      JSON.stringify({
        mode: "external-apply",
        sourceUrl: "https://apply.workable.com/acme/j/123/apply",
        discovery: {
          platform: "workable",
          precursorPage: false,
          precursorSignals: [],
          followedPrecursorLink: null,
        },
        fillResult: {
          primaryAction: "unknown",
          siteFeedback: {
            errors: [],
            warnings: ["Profile is incomplete."],
            infos: [],
          },
          aiCorrectionAttempts: [],
        },
        finalStage: "unknown",
        stopReason: "No application fields were discovered on the target page.",
        failureReasonCode: "external.unknown_final_stage",
        retryable: true,
        missingProfileData: [],
        meta: {
          durationMs: 21565,
          summary: "external-apply on workable reached unknown after 21565ms.",
          keyEvents: ["Opened external application source URL."],
          metrics: {
            finalStage: "unknown",
            precursorFollowed: false,
          },
        },
      }),
    );

    const artifact = readArtifactById(buildArtifactId("external-apply-runs", "external-live.json"));

    expect(artifact?.details).toMatchObject({
      mode: "external-apply",
      status: "unknown",
      platform: "workable",
      finalStage: "unknown",
      stopReason: "No application fields were discovered on the target page.",
      externalApplyUrl: "https://apply.workable.com/acme/j/123/apply",
      durationMs: 21565,
      runSummary: "external-apply on workable reached unknown after 21565ms.",
      siteFeedback: ["Profile is incomplete."],
      recovery: {
        failureReasonCode: "external.unknown_final_stage",
        retryable: true,
        missingProfileData: [],
      },
    });
  });

  it("normalizes standalone external recovery metadata", () => {
    const reportPath = path.join(tempRoot, "artifacts", "batch-runs", "external.json");
    fs.writeFileSync(
      reportPath,
      JSON.stringify({
        finalStage: "form_step",
        discovery: {
          platform: "workable",
        },
        stopReason: "Required fields remain unanswered.",
        failureReasonCode: "external.missing_required_answer",
        retryable: true,
        missingProfileData: ["availability.noticePeriod", 12, ""],
      }),
    );

    const artifact = readArtifactById(buildArtifactId("batch-runs", "external.json"));

    expect(artifact?.details?.recovery).toEqual({
      failureReasonCode: "external.missing_required_answer",
      retryable: true,
      missingProfileData: ["availability.noticePeriod"],
    });
    expect(artifact?.details?.platform).toBe("workable");
  });

  it("normalizes nested batch recovery metadata and prioritizes the operational stop reason", () => {
    const reportPath = path.join(tempRoot, "artifacts", "batch-runs", "recovery.json");
    fs.writeFileSync(
      reportPath,
      JSON.stringify({
        result: {
          jobs: [
            {
              url: "https://www.linkedin.com/jobs/view/3",
              evaluation: {
                shouldApply: true,
                finalDecision: "APPLY",
                score: 74,
                reason: "Strong scoring match.",
              },
              result: {
                status: "stopped_external_apply",
                retryable: false,
                unknownActionDiagnostics: {
                  overlayTextSample: "Loading application questions...",
                  visibleButtonLabels: [],
                },
                externalApplication: {
                  platform: "workable",
                  stopReason: "Could not submit because notice period is missing.",
                  failureReasonCode: "external.missing_required_answer",
                  retryable: true,
                  missingProfileData: ["availability.noticePeriod"],
                },
              },
            },
          ],
        },
      }),
    );

    const artifact = readArtifactById(buildArtifactId("batch-runs", "recovery.json"));
    const incomplete = artifact?.details?.outcomeJobs?.incomplete[0];

    expect(incomplete).toMatchObject({
      reason: "Could not submit because notice period is missing.",
      failureReasonCode: "external.missing_required_answer",
      retryable: false,
      missingProfileData: ["availability.noticePeriod"],
      platform: "workable",
      unknownActionDiagnostics: {
        currentUrl: null,
        activeElement: null,
        visibleButtonLabels: [],
        modalHtmlSample: null,
        overlayTextSample: "Loading application questions...",
      },
    });
  });

  it("parses live apply-batch jobs that embed external application artifacts", () => {
    const reportPath = path.join(tempRoot, "artifacts", "batch-runs", "apply-batch-live.json");
    fs.writeFileSync(
      reportPath,
      JSON.stringify({
        mode: "apply-batch",
        applyBatch: {
          status: "partial",
          stopReason: "Processed 1 application.",
          jobs: [
            {
              url: "https://reactjobs.io/jobs/1",
              title: "Senior Fullstack Engineer",
              company: "Stack Builders",
              location: "Remote /",
              status: "processed",
              evaluation: {
                shouldApply: true,
                finalDecision: "APPLY",
                score: 45,
                reason: "Score 45 meets the threshold.",
                diagnostics: {
                  title: "Senior Fullstack Engineer",
                  company: "Stack Builders",
                  location: "Remote /",
                },
              },
              application: {
                mode: "external-apply",
                sourceUrl: "https://apply.workable.com/stackbuilders/j/445/apply",
                discovery: {
                  platform: "workable",
                },
                fillResult: {
                  primaryAction: "unknown",
                },
                finalStage: "unknown",
                stopReason: "No application fields were discovered on the target page.",
                failureReasonCode: "external.unknown_final_stage",
                retryable: true,
                missingProfileData: [],
              },
            },
          ],
        },
      }),
    );

    const artifact = readArtifactById(buildArtifactId("batch-runs", "apply-batch-live.json"));

    expect(artifact?.details).toMatchObject({
      mode: "apply-batch",
      status: "partial",
      stopReason: "Processed 1 application.",
      runSummary: "Processed 1 application.",
    });
    expect(artifact?.details?.outcomeJobs?.recommended).toEqual([
      {
        url: "https://reactjobs.io/jobs/1",
        title: "Senior Fullstack Engineer",
        company: "Stack Builders",
        location: "Remote /",
        platform: "workable",
        score: 45,
        decision: "APPLY",
        status: "processed",
        reason: "No application fields were discovered on the target page.",
        failureReasonCode: "external.unknown_final_stage",
        retryable: true,
        missingProfileData: [],
        unknownActionDiagnostics: null,
      },
    ]);
    expect(artifact?.details?.outcomeJobs?.incomplete).toEqual([
      {
        url: "https://reactjobs.io/jobs/1",
        title: "Senior Fullstack Engineer",
        company: "Stack Builders",
        location: "Remote /",
        platform: "workable",
        score: 45,
        decision: "APPLY",
        status: "processed",
        reason: "No application fields were discovered on the target page.",
        failureReasonCode: "external.unknown_final_stage",
        retryable: true,
        missingProfileData: [],
        unknownActionDiagnostics: null,
      },
    ]);
  });

  it("keeps direct Kariyer terminal job failures as incomplete outcomes", () => {
    const reportPath = path.join(tempRoot, "artifacts", "batch-runs", "kariyer-direct-failure.json");
    fs.writeFileSync(
      reportPath,
      JSON.stringify({
        mode: "apply-batch",
        dryRun: true,
        applyBatch: {
          status: "partial",
          jobs: [
            {
              url: "https://www.kariyer.net/is-ilani/acme-yazilim-gelistirme-uzmani-123",
              title: "Yazilim Gelistirme Uzmani",
              company: "Acme",
              location: "Istanbul",
              status: "failed",
              error: "Kariyer.net requires manual security verification.",
            },
          ],
        },
      }),
    );

    const artifact = readArtifactById(buildArtifactId("batch-runs", "kariyer-direct-failure.json"));

    expect(artifact?.details?.outcomeJobs?.incomplete).toEqual([
      expect.objectContaining({
        url: "https://www.kariyer.net/is-ilani/acme-yazilim-gelistirme-uzmani-123",
        title: "Yazilim Gelistirme Uzmani",
        company: "Acme",
        status: "failed",
        reason: "Kariyer.net requires manual security verification.",
      }),
    ]);
  });

  it("normalizes LinkedIn unknown-action diagnostics", () => {
    const reportPath = path.join(tempRoot, "artifacts", "batch-runs", "unknown-action.json");
    fs.writeFileSync(
      reportPath,
      JSON.stringify({
        easyApply: {
          status: "stopped_unknown_action",
          failureReasonCode: "linkedin.empty_or_unrecognized_action_state",
          retryable: true,
          unknownActionDiagnostics: {
            currentUrl: "https://www.linkedin.com/jobs/view/4",
            activeElement: {
              tagName: "input",
              inputType: "search",
              role: "combobox",
              ariaLabel: "Search",
              placeholder: "Search",
              text: "",
            },
            visibleButtonLabels: ["Dismiss", 2],
            modalHtmlSample: "<div>Loading application questions...</div>",
            overlayTextSample: "Apply to Acme",
          },
        },
      }),
    );

    const artifact = readArtifactById(buildArtifactId("batch-runs", "unknown-action.json"));

    expect(artifact?.details?.recovery).toEqual({
      failureReasonCode: "linkedin.empty_or_unrecognized_action_state",
      retryable: true,
      missingProfileData: [],
    });
    expect(artifact?.details?.unknownActionDiagnostics).toEqual({
      currentUrl: "https://www.linkedin.com/jobs/view/4",
      activeElement: {
        tagName: "input",
        inputType: "search",
        role: "combobox",
        ariaLabel: "Search",
        placeholder: "Search",
        text: null,
      },
      visibleButtonLabels: ["Dismiss"],
      modalHtmlSample: "<div>Loading application questions...</div>",
      overlayTextSample: "Apply to Acme",
    });
  });

  it("loads a single artifact by stable id", () => {
    const reportPath = path.join(tempRoot, "artifacts", "batch-runs", "report.json");
    fs.writeFileSync(reportPath, JSON.stringify({ meta: { summary: "Run finished." } }));

    const artifact = readArtifactById(buildArtifactId("batch-runs", "report.json"));

    expect(artifact).toMatchObject({
      id: buildArtifactId("batch-runs", "report.json"),
      name: "report.json",
      category: "batch-runs",
      fullPath: reportPath,
    });
    expect(artifact?.details?.runSummary).toBe("Run finished.");
  });

  it("returns null for unknown artifact ids", () => {
    expect(readArtifactById("not-a-real-id")).toBeNull();
    expect(readArtifactById(buildArtifactId("unknown", "report.json"))).toBeNull();
  });

  it("rejects traversal attempts outside the selected artifact category", () => {
    const authDir = path.join(tempRoot, ".auth");
    fs.mkdirSync(authDir, { recursive: true });
    fs.writeFileSync(path.join(authDir, "linkedin-session.json"), JSON.stringify({ cookie: "secret-cookie" }));

    expect(
      readArtifactById(buildArtifactId("batch-runs", "../../.auth/linkedin-session.json")),
    ).toBeNull();
    expect(
      readArtifactById(buildArtifactId("batch-runs", "..\\..\\.auth\\linkedin-session.json")),
    ).toBeNull();
  });

  it("redacts credential-like values from JSON previews", () => {
    const reportPath = path.join(tempRoot, "artifacts", "batch-runs", "sensitive.json");
    fs.writeFileSync(
      reportPath,
      JSON.stringify({
        status: "completed",
        accessToken: "top-secret-token",
        nested: { cookie: "li-at-secret", safe: "visible" },
      }),
    );

    const artifact = readArtifactById(buildArtifactId("batch-runs", "sensitive.json"));

    expect(artifact?.preview).toContain("[REDACTED]");
    expect(artifact?.preview).toContain("visible");
    expect(artifact?.preview).not.toContain("top-secret-token");
    expect(artifact?.preview).not.toContain("li-at-secret");
  });

  it("does not parse or preview oversized JSON artifacts", () => {
    const reportPath = path.join(tempRoot, "artifacts", "batch-runs", "oversized.json");
    fs.writeFileSync(reportPath, JSON.stringify({ payload: "x".repeat(MAX_ARTIFACT_JSON_BYTES) }));

    const artifact = readArtifactById(buildArtifactId("batch-runs", "oversized.json"));

    expect(artifact).not.toBeNull();
    expect(artifact?.preview).toBeNull();
    expect(artifact?.details).toBeNull();
  });

  it("rejects symlinked artifact files when the platform permits creating them", () => {
    const externalPath = path.join(tempRoot, "outside.json");
    const linkPath = path.join(tempRoot, "artifacts", "batch-runs", "linked.json");
    fs.writeFileSync(externalPath, JSON.stringify({ token: "outside-secret" }));

    try {
      fs.symlinkSync(externalPath, linkPath, "file");
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EPERM") {
        return;
      }
      throw error;
    }

    expect(readArtifactById(buildArtifactId("batch-runs", "linked.json"))).toBeNull();
  });
});
