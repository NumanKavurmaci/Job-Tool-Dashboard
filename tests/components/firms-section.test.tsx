import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { FirmsSection } from "@/src/components/dashboard/firms-section";

describe("FirmsSection", () => {
  it("renders linked company metadata and decision filters", () => {
    const html = renderToStaticMarkup(
      <FirmsSection
        firms={[
          {
            id: "firm-1",
            name: "Ticimax",
            logoUrl: "https://cdn.example.com/ticimax.png",
            linkedinUrl: "https://www.linkedin.com/company/ticimax/life/",
            totalReviewedJobs: 4,
            appliedJobs: 1,
            skippedJobs: 3,
            decisionIdsJson: JSON.stringify(["decision-1", "decision-2"]),
            updatedAt: "2026-03-29T12:00:00.000Z",
          },
        ]}
      />,
    );

    expect(html).toContain("Ticimax");
    expect(html).toContain("LinkedIn company page");
    expect(html).toContain("/decisions?company=Ticimax");
    expect(html).toContain("/decisions?decisionId=decision-1");
    expect(html).toContain("4 reviewed");
    expect(html).toContain("1 apply");
    expect(html).toContain("3 skip");
  });

  it("renders fallback text when linkedin URL is missing", () => {
    const html = renderToStaticMarkup(
      <FirmsSection
        firms={[
          {
            id: "firm-2",
            name: "Unknown Co",
            logoUrl: null,
            linkedinUrl: null,
            totalReviewedJobs: 0,
            appliedJobs: 0,
            skippedJobs: 0,
            decisionIdsJson: "[]",
            updatedAt: "2026-03-29T12:00:00.000Z",
          },
        ]}
      />,
    );

    expect(html).toContain("LinkedIn company page not captured yet.");
    expect(html).toContain("No decisions linked yet.");
  });

  it("falls back safely when decision ids are invalid JSON", () => {
    const html = renderToStaticMarkup(
      <FirmsSection
        firms={[
          {
            id: "firm-3",
            name: "Broken JSON Inc",
            logoUrl: null,
            linkedinUrl: null,
            totalReviewedJobs: 2,
            appliedJobs: 1,
            skippedJobs: 1,
            decisionIdsJson: "{bad json}",
            updatedAt: "2026-03-29T12:00:00.000Z",
          },
        ]}
      />,
    );

    expect(html).toContain("Broken JSON Inc");
    expect(html).toContain("B");
    expect(html).toContain("/decisions?company=Broken+JSON+Inc");
    expect(html).toContain("No decisions linked yet.");
  });
});
