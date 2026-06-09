import Database from "better-sqlite3";
import { mkdtempSync, mkdirSync, writeFileSync } from "node:fs";
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
});
