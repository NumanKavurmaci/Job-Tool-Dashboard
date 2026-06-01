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
      platform: "workable",
      durationMs: 90_000,
      runSummary: "Explore batch evaluated 24 jobs.",
      outcomeJobs: {
        recommended: [
          {
            url: "https://www.linkedin.com/jobs/view/1",
            title: "Backend Engineer",
            company: "Acme",
            location: "Remote",
            platform: null,
            score: 88,
            decision: "APPLY",
            status: null,
            reason: "Strong match.",
            failureReasonCode: null,
            retryable: null,
            missingProfileData: [],
            unknownActionDiagnostics: null,
          },
        ],
        applied: [
          {
            url: "https://www.linkedin.com/jobs/view/2",
            title: "Full Stack Engineer",
            company: "Beta",
            location: "Remote",
            platform: null,
            score: 80,
            decision: "APPLY",
            status: "submitted",
            reason: "Application submitted successfully.",
            failureReasonCode: null,
            retryable: null,
            missingProfileData: [],
            unknownActionDiagnostics: null,
          },
        ],
        incomplete: [
          {
            url: "https://www.linkedin.com/jobs/view/3",
            title: "Frontend Engineer",
            company: "Gamma",
            location: "Hybrid",
            platform: "workable",
            score: 74,
            decision: "APPLY",
            status: "failed",
            reason: "Validation blocked submission.",
            failureReasonCode: "external.required_field_fill_failed",
            retryable: true,
            missingProfileData: ["availability.startDate"],
            unknownActionDiagnostics: {
              currentUrl: "https://www.linkedin.com/jobs/view/3",
              activeElement: null,
              visibleButtonLabels: [],
              modalHtmlSample: null,
              overlayTextSample: "Loading application questions...",
            },
          },
        ],
      },
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
      recovery: {
        failureReasonCode: "external.missing_required_answer",
        retryable: true,
        missingProfileData: ["availability.noticePeriod"],
      },
      unknownActionDiagnostics: {
        currentUrl: "https://www.linkedin.com/jobs/view/3",
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
        overlayTextSample: "Apply to Gamma",
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

    expect(html).toContain("Run outcomes");
    expect(html).toContain("Recommended");
    expect(html).toContain("Applied");
    expect(html).toContain("Tried but incomplete");
    expect(html).toContain("Backend Engineer");
    expect(html).toContain("Full Stack Engineer");
    expect(html).toContain("Frontend Engineer");
    expect(html).toContain("Run details");
    expect(html).toContain("workable");
    expect(html).toContain("Slowest run steps");
    expect(html).toContain("job.evaluate");
    expect(html).toContain("1.0 min total");
    expect(html).toContain("24x / avg 2.5 s / max 5.0 s");
    expect(html).toContain("external.required_field_fill_failed");
    expect(html).toContain("external.missing_required_answer");
    expect(html).toContain("Retryable");
    expect(html).toContain("availability.startDate");
    expect(html).toContain("availability.noticePeriod");
    expect(html).toContain("Unknown action context");
    expect(html).toContain("Unknown action diagnostics");
    expect(html).toContain("Loading application questions...");
    expect(html).toContain("Apply to Gamma");
    expect(html).toContain("Raw JSON preview");
  });
});
