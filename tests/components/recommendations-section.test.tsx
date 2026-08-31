import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RecommendationsSection } from "@/src/components/dashboard/recommendations-section";

const baseRecommendation = {
  id: "recommendation-1",
  recommendationStatus: "RECOMMENDED",
  source: "linkedin-explore",
  score: 87,
  decision: "APPLY",
  policyAllowed: 1,
  summary: "Strong product engineering match.",
  reasons: JSON.stringify(["React experience", "Remote role"]),
  detailsJson: null,
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
});
