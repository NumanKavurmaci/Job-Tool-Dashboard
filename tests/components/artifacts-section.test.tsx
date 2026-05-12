import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  ArtifactDetailsSection,
  ArtifactsSection,
} from "@/src/components/dashboard/artifacts-section";
import { buildArtifactId, type ArtifactSummary } from "@/lib/engine-artifacts";

function createArtifact(overrides: Partial<ArtifactSummary> = {}): ArtifactSummary {
  return {
    id: buildArtifactId("batch-runs", "run.json"),
    name: "run.json",
    category: "batch-runs",
    fullPath: "C:\\engine\\artifacts\\batch-runs\\run.json",
    updatedAt: "2026-05-12T10:00:00.000Z",
    size: 2048,
    preview: "{\"meta\":{}}",
    details: {
      mode: "explore-batch",
      status: "completed",
      durationMs: 90_000,
      runSummary: "Explore batch evaluated 24 jobs.",
      timings: {
        "job.evaluate": {
          count: 24,
          totalMs: 60_000,
          avgMs: 2500,
          maxMs: 5000,
        },
        "history.batchLookup": {
          count: 4,
          totalMs: 800,
          avgMs: 200,
          maxMs: 300,
        },
      },
    },
    ...overrides,
  };
}

describe("ArtifactsSection", () => {
  it("renders a compact run index with links to individual run pages", () => {
    const artifact = createArtifact();
    const html = renderToStaticMarkup(<ArtifactsSection artifacts={[artifact]} />);

    expect(html).toContain("Recent runs");
    expect(html).toContain("run.json");
    expect(html).toContain("Explore batch evaluated 24 jobs.");
    expect(html).toContain(`href="/artifacts/${artifact.id}"`);
    expect(html).not.toContain("Slowest run steps");
  });

  it("renders timing diagnostics on the detail view", () => {
    const html = renderToStaticMarkup(<ArtifactDetailsSection artifact={createArtifact()} />);

    expect(html).toContain("Run details");
    expect(html).toContain("Slowest run steps");
    expect(html).toContain("job.evaluate");
    expect(html).toContain("1.0 min total");
    expect(html).toContain("24x / avg 2.5 s / max 5.0 s");
    expect(html).toContain("Raw JSON preview");
  });
});
