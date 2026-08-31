import Database from "better-sqlite3";
import { mkdtempSync, mkdirSync, utimesSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

const originalEngineRoot = process.env.ENGINE_ROOT;

describe("run progress", () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(path.join(os.tmpdir(), "job-tool-dashboard-progress-"));
    process.env.ENGINE_ROOT = tempDir;
    mkdirSync(path.join(tempDir, "prisma"), { recursive: true });
    mkdirSync(path.join(tempDir, "logs"), { recursive: true });
    mkdirSync(path.join(tempDir, "artifacts", "batch-runs"), { recursive: true });

    const db = new Database(path.join(tempDir, "prisma", "dev.db"));
    db.exec(`
      CREATE TABLE JobPosting (
        id TEXT PRIMARY KEY,
        url TEXT,
        title TEXT,
        company TEXT,
        location TEXT
      );
      CREATE TABLE JobReviewHistory (
        id TEXT PRIMARY KEY,
        jobPostingId TEXT,
        jobUrl TEXT NOT NULL,
        source TEXT NOT NULL,
        status TEXT NOT NULL,
        score INTEGER,
        threshold INTEGER,
        decision TEXT,
        policyAllowed INTEGER,
        reasons TEXT NOT NULL,
        summary TEXT,
        detailsJson TEXT,
        createdAt INTEGER NOT NULL
      );
    `);
    db.prepare("INSERT INTO JobPosting (id, url, title, company, location) VALUES (?, ?, ?, ?, ?)").run(
      "job-1",
      "https://www.linkedin.com/jobs/view/123",
      "Software Engineer",
      "Acme",
      "Remote",
    );
    db.prepare(`
      INSERT INTO JobReviewHistory
        (id, jobPostingId, jobUrl, source, status, score, threshold, decision, policyAllowed, reasons, summary, createdAt)
      VALUES
        (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      "review-1",
      "job-1",
      "https://www.linkedin.com/jobs/view/123",
      "apply-batch",
      "EVALUATED",
      72,
      40,
      "APPLY",
      1,
      "[]",
      "Score 72 meets threshold.",
      1781017055000,
    );
    db.close();

    writeFileSync(
      path.join(tempDir, "logs", "app.log"),
      [
        JSON.stringify({
          level: 30,
          time: 1781017051000,
          event: "linkedin.auth.state",
          url: "https://www.linkedin.com/jobs/view/123/",
          title: "Software Engineer | Acme | LinkedIn",
          msg: "LinkedIn auth state detected",
        }),
        JSON.stringify({
          level: 30,
          time: 1781017056000,
          url: "https://www.linkedin.com/jobs/view/123",
          finalDecision: "APPLY",
          totalScore: 72,
          msg: "LinkedIn Easy Apply job evaluated",
        }),
      ].join("\n"),
    );
  });

  afterEach(() => {
    if (originalEngineRoot === undefined) {
      delete process.env.ENGINE_ROOT;
    } else {
      process.env.ENGINE_ROOT = originalEngineRoot;
    }
  });

  it("reads numeric SQLite timestamps and infers the active application", async () => {
    const { readRunProgress } = await import("@/lib/run-progress");

    const progress = readRunProgress({
      startedAt: new Date(1781017050000).toISOString(),
      mode: "apply-batch",
    });

    expect(progress.evaluatedCount).toBe(1);
    expect(progress.applyDecisionCount).toBe(1);
    expect(progress.reviews[0]).toMatchObject({
      createdAt: "2026-06-09T14:57:35.000Z",
      title: "Software Engineer",
      company: "Acme",
    });
    expect(progress.currentActivity).toMatchObject({
      stage: "applying",
      label: "Applying Software Engineer at Acme",
      score: 72,
      decision: "APPLY",
    });
  });

  it("identifies external apply outcomes from live processing logs before batch history is finalized", async () => {
    writeFileSync(
      path.join(tempDir, "logs", "app.log"),
      [
        JSON.stringify({
          level: 30,
          time: 1781017056000,
          url: "https://www.linkedin.com/jobs/view/123",
          finalDecision: "APPLY",
          totalScore: 72,
          msg: "LinkedIn Easy Apply job evaluated",
        }),
        JSON.stringify({
          level: 30,
          time: 1781017057000,
          jobUrl: "https://www.linkedin.com/jobs/view/123",
          finalDecision: "APPLY",
          resultStatus: "stopped_external_apply",
          externalApplyUrl: "https://apply.example.com/jobs/123",
          msg: "Finished application processing for approved job",
        }),
      ].join("\n"),
    );

    const { readRunProgress } = await import("@/lib/run-progress");
    const progress = readRunProgress({
      startedAt: new Date(1781017050000).toISOString(),
      mode: "apply-batch",
    });

    expect(progress.reviews[0]).toMatchObject({
      applicationType: "external",
      externalApplyUrl: "https://apply.example.com/jobs/123",
    });
  });

  it("collapses repeated review history into the latest canonical job outcome", async () => {
    const db = new Database(path.join(tempDir, "prisma", "dev.db"));
    db.prepare(`
      INSERT INTO JobReviewHistory
        (id, jobPostingId, jobUrl, source, status, score, threshold, decision, policyAllowed, reasons, summary, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      "review-1-terminal",
      "job-1",
      "https://www.linkedin.com/jobs/view/123/?trackingId=duplicate",
      "apply-batch",
      "FAILED",
      72,
      40,
      "APPLY",
      1,
      "[]",
      "Application attempt timed out.",
      1781017057000,
    );
    db.close();

    const { readRunProgress } = await import("@/lib/run-progress");
    const progress = readRunProgress({
      startedAt: new Date(1781017050000).toISOString(),
      mode: "apply-batch",
    });

    expect(progress.reviews).toHaveLength(1);
    expect(progress.reviews[0]).toMatchObject({
      status: "FAILED",
      decision: "APPLY",
      summary: "Application attempt timed out.",
    });
    expect(progress.evaluatedCount).toBe(1);
    expect(progress.applyDecisionCount).toBe(1);
    expect(progress.failedCount).toBe(1);
  });

  it("isolates overlapping runs by correlation id across reviews, logs, and artifacts", async () => {
    const dbPath = path.join(tempDir, "prisma", "dev.db");
    const db = new Database(dbPath);
    db.prepare("UPDATE JobReviewHistory SET detailsJson = ? WHERE id = ?").run(
      JSON.stringify({ dashboardRunId: "run-a" }),
      "review-1",
    );
    db.prepare(`
      INSERT INTO JobReviewHistory
        (id, jobPostingId, jobUrl, source, status, score, threshold, decision, policyAllowed, reasons, summary, detailsJson, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      "review-2",
      null,
      "https://www.linkedin.com/jobs/view/456",
      "apply-batch",
      "EVALUATED",
      31,
      40,
      "SKIP",
      0,
      "[]",
      "Below threshold.",
      JSON.stringify({ dashboardRunId: "run-b" }),
      1781017056000,
    );
    db.close();

    writeFileSync(
      path.join(tempDir, "logs", "app.log"),
      [
        JSON.stringify({
          level: 30,
          time: 1781017056000,
          dashboardRunId: "run-a",
          url: "https://www.linkedin.com/jobs/view/123",
          finalDecision: "APPLY",
          totalScore: 72,
          msg: "LinkedIn Easy Apply job evaluated",
        }),
        JSON.stringify({
          level: 30,
          time: 1781017057000,
          dashboardRunId: "run-b",
          url: "https://www.linkedin.com/jobs/view/456",
          finalDecision: "SKIP",
          totalScore: 31,
          msg: "LinkedIn Easy Apply job evaluated",
        }),
      ].join("\n"),
    );

    const artifactA = path.join(tempDir, "artifacts", "batch-runs", "2026-run-a-apply-batch.json");
    const artifactB = path.join(tempDir, "artifacts", "batch-runs", "2026-run-b-apply-batch.json");
    writeFileSync(artifactA, "{}");
    writeFileSync(artifactB, "{}");
    const artifactTime = new Date(1781017058000);
    utimesSync(artifactA, artifactTime, artifactTime);
    utimesSync(artifactB, artifactTime, artifactTime);

    const { readRunProgress } = await import("@/lib/run-progress");
    const common = {
      startedAt: new Date(1781017050000).toISOString(),
      finishedAt: new Date(1781017060000).toISOString(),
      mode: "apply-batch",
    };
    const runA = readRunProgress({ ...common, runId: "run-a" });
    const runB = readRunProgress({ ...common, runId: "run-b" });

    expect(runA.reviews.map((review) => review.jobUrl)).toEqual([
      "https://www.linkedin.com/jobs/view/123",
    ]);
    expect(runB.reviews.map((review) => review.jobUrl)).toEqual([
      "https://www.linkedin.com/jobs/view/456",
    ]);
    expect(runA.currentActivity).toMatchObject({ decision: "APPLY", score: 72 });
    expect(runB.currentActivity).toMatchObject({ decision: "SKIP", score: 31 });
    expect(runA.latestArtifact?.name).toContain("-run-a-");
    expect(runB.latestArtifact?.name).toContain("-run-b-");
  });

  it("falls back to batch artifact outcomes when a provider writes no review row", async () => {
    const db = new Database(path.join(tempDir, "prisma", "dev.db"));
    db.prepare("DELETE FROM JobReviewHistory").run();
    db.close();

    const runId = "kariyer-run";
    const artifactPath = path.join(
      tempDir,
      "artifacts",
      "batch-runs",
      `2026-06-09-${runId}-apply-batch-dry-run.json`,
    );
    writeFileSync(
      artifactPath,
      JSON.stringify({
        mode: "apply-batch",
        dryRun: true,
        dashboardRunId: runId,
        applyBatch: {
          status: "partial",
          stopReason: "Security verification blocked the remaining jobs.",
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
    const artifactTime = new Date(1781017058000);
    utimesSync(artifactPath, artifactTime, artifactTime);

    const { readRunProgress } = await import("@/lib/run-progress");
    const progress = readRunProgress({
      startedAt: new Date(1781017050000).toISOString(),
      finishedAt: new Date(1781017060000).toISOString(),
      mode: "apply-batch",
      runId,
    });

    expect(progress.evaluatedCount).toBe(1);
    expect(progress.failedCount).toBe(1);
    expect(progress.terminalOutcome).toEqual({
      status: "partial",
      reason: "Security verification blocked the remaining jobs.",
    });
    expect(progress.reviews).toEqual([
      expect.objectContaining({
        jobUrl: "https://www.kariyer.net/is-ilani/acme-yazilim-gelistirme-uzmani-123",
        title: "Yazilim Gelistirme Uzmani",
        company: "Acme",
        status: "FAILED",
        summary: "Kariyer.net requires manual security verification.",
      }),
    ]);
  });

  it("reads recent outcomes without depending on the in-memory run registry", async () => {
    const artifactPath = path.join(
      tempDir,
      "artifacts",
      "batch-runs",
      "latest-kariyer-apply-batch-dry-run.json",
    );
    writeFileSync(
      artifactPath,
      JSON.stringify({
        applyBatch: {
          jobs: [
            {
              url: "https://www.kariyer.net/is-ilani/acme-yazilim-gelistirme-uzmani-456",
              title: "Kariyer Role",
              company: "Kariyer Company",
              status: "failed",
              error: "Login is required.",
            },
          ],
        },
      }),
    );
    const artifactTime = new Date(1781017060000);
    utimesSync(artifactPath, artifactTime, artifactTime);

    const { readLatestJobOutcomes } = await import("@/lib/run-progress");
    const outcomes = readLatestJobOutcomes(8);

    expect(outcomes[0]).toMatchObject({
      jobUrl: "https://www.kariyer.net/is-ilani/acme-yazilim-gelistirme-uzmani-456",
      title: "Kariyer Role",
      company: "Kariyer Company",
      status: "FAILED",
      summary: "Login is required.",
    });
    expect(outcomes.some((outcome) => outcome.jobUrl === "https://www.linkedin.com/jobs/view/123")).toBe(true);
  });
});
