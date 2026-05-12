import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
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
});
