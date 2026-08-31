import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import {
  filterRecommendations,
  RecommendationsSection,
} from "@/src/components/dashboard/recommendations-section";

const baseRecommendation = {
  id: "recommendation-1",
  recommendationStatus: "RECOMMENDED",
  source: "linkedin-explore",
  score: 87,
  decision: "APPLY",
  policyAllowed: 1,
  summary: "Strong product engineering match.",
  reasons: JSON.stringify(["React experience", "Remote role"]),
  detailsJson: JSON.stringify({ diagnostics: { applicationType: "easy_apply" } }),
  dashboardRunId: null,
  createdAt: "2026-08-31T10:00:00.000Z",
  updatedAt: "2026-08-31T10:00:00.000Z",
  jobPostingId: "job-1",
  jobUrl: "https://www.linkedin.com/jobs/view/1/",
  title: "Senior Product Engineer",
  company: "Hired",
  companyLogoUrl: "https://media.licdn.com/hired-logo.png",
  companyLinkedinUrl: "https://www.linkedin.com/company/hiredddd/life",
  location: "Remote",
  normalizedJson: JSON.stringify({ remoteType: "remote", seniority: "senior" }),
};

describe("RecommendationsSection", () => {
  it("defaults to a responsive grid and renders linked company logos", () => {
    const html = renderToStaticMarkup(
      <RecommendationsSection recommendations={[baseRecommendation]} />,
    );

    expect(html).toContain('data-view-mode="grid"');
    expect(html).toContain("md:grid-cols-2");
    expect(html).toContain("xl:grid-cols-3");
    expect(html).toContain('src="https://media.licdn.com/hired-logo.png"');
    expect(html).toContain('alt="Hired logo"');
    expect(html).toContain("Hired LinkedIn company page");
    expect(html).toContain("https://www.linkedin.com/company/hiredddd/life");
    expect(html).toContain("Last 7 days");
    expect(html).toContain("Latest run");
    expect(html).toContain("Last 3 runs");
    expect(html).toContain("Easy Apply");
  });

  it("uses a company initial when no logo was captured", () => {
    const html = renderToStaticMarkup(
      <RecommendationsSection
        recommendations={[
          {
            ...baseRecommendation,
            id: "recommendation-2",
            company: "Acme",
            companyLogoUrl: null,
            companyLinkedinUrl: null,
          },
        ]}
      />,
    );

    expect(html).not.toContain("<img");
    expect(html).toContain(">A</span>");
  });

  it("filters by the last seven days and the most recent run ids", () => {
    const nowMs = Date.parse("2026-08-31T12:00:00.000Z");
    const recommendations = [
      {
        ...baseRecommendation,
        id: "latest",
        dashboardRunId: "run-latest",
        updatedAt: "2026-08-31T10:00:00.000Z",
      },
      {
        ...baseRecommendation,
        id: "second",
        dashboardRunId: "run-second",
        updatedAt: "2026-08-29T10:00:00.000Z",
      },
      {
        ...baseRecommendation,
        id: "third",
        dashboardRunId: "run-third",
        updatedAt: "2026-08-28T10:00:00.000Z",
      },
      {
        ...baseRecommendation,
        id: "old",
        dashboardRunId: "run-old",
        updatedAt: "2026-08-20T10:00:00.000Z",
      },
      {
        ...baseRecommendation,
        id: "legacy",
        dashboardRunId: null,
        updatedAt: "2026-08-30T10:00:00.000Z",
      },
    ];

    expect(
      filterRecommendations({
        recommendations,
        timeFilter: "last-7-days",
        runFilter: "all",
        nowMs,
      }).map((recommendation) => recommendation.id),
    ).toEqual(["latest", "second", "third", "legacy"]);

    expect(
      filterRecommendations({
        recommendations,
        timeFilter: "all",
        runFilter: "latest",
        nowMs,
      }).map((recommendation) => recommendation.id),
    ).toEqual(["latest"]);

    expect(
      filterRecommendations({
        recommendations,
        timeFilter: "all",
        runFilter: "last-3",
        nowMs,
      }).map((recommendation) => recommendation.id),
    ).toEqual(["latest", "second", "third"]);
  });
});
