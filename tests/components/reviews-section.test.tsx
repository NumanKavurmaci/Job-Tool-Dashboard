import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ReviewsSection } from "@/src/components/dashboard/reviews-section";

describe("ReviewsSection", () => {
  it("links company names to the LinkedIn company page when captured", () => {
    const html = renderToStaticMarkup(
      <ReviewsSection
        reviews={[
          {
            id: "review-1",
            jobUrl: "https://www.linkedin.com/jobs/view/1",
            platform: "linkedin",
            source: "easy-apply-dry-run",
            status: "SKIPPED",
            score: 52,
            threshold: 60,
            decision: "SKIP",
            policyAllowed: 1,
            reasons: "[]",
            summary: "Score below threshold.",
            createdAt: "2026-03-29T12:00:00.000Z",
            title: "System Engineer",
            company: "Ticimax",
            companyLinkedinUrl: "https://www.linkedin.com/company/ticimax/life/",
            location: "Istanbul, Türkiye",
          },
        ]}
      />,
    );

    expect(html).toContain("System Engineer");
    expect(html).toContain("https://www.linkedin.com/company/ticimax/life/");
    expect(html).toContain("Ticimax");
    expect(html).toContain("/decisions?company=Ticimax&amp;jobUrl=https%3A%2F%2Fwww.linkedin.com%2Fjobs%2Fview%2F1");
  });

  it("falls back to plain text when the company LinkedIn URL is missing", () => {
    const html = renderToStaticMarkup(
      <ReviewsSection
        reviews={[
          {
            id: "review-2",
            jobUrl: "https://www.linkedin.com/jobs/view/2",
            platform: "linkedin",
            source: "easy-apply-dry-run",
            status: "SKIPPED",
            score: 20,
            threshold: 60,
            decision: "SKIP",
            policyAllowed: 0,
            reasons: "[]",
            summary: "Policy blocked.",
            createdAt: "2026-03-29T12:00:00.000Z",
            title: "Researcher",
            company: "Unknown Co",
            companyLinkedinUrl: null,
            location: null,
          },
        ]}
      />,
    );

    expect(html).toContain("Unknown Co");
    expect(html).not.toContain("linkedin.com/company");
  });
});
