import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DecisionsSection } from "@/src/components/dashboard/decisions-section";

describe("DecisionsSection", () => {
  it("renders detailed decision cards with reason chips and links", () => {
    const html = renderToStaticMarkup(
      <DecisionsSection
        decisions={[
          {
            id: "decision-1",
            decision: "SKIP",
            score: 41,
            policyAllowed: 0,
            reasons: JSON.stringify(["Only remote roles are allowed.", "Score below threshold."]),
            createdAt: "2026-03-29T12:00:00.000Z",
            jobPostingId: "job-1",
            jobUrl: "https://www.linkedin.com/jobs/view/1",
            title: "System Engineer",
            company: "Ticimax",
            companyLogoUrl: "https://cdn.example.com/logo.png",
            companyLinkedinUrl: "https://www.linkedin.com/company/ticimax/life/",
            location: "Istanbul, Türkiye",
          },
        ]}
      />,
    );

    expect(html).toContain("System Engineer");
    expect(html).toContain("Ticimax");
    expect(html).toContain("Istanbul, Türkiye");
    expect(html).toContain("Policy blocked");
    expect(html).toContain("Score 41");
    expect(html).toContain("Only remote roles are allowed.");
    expect(html).toContain("Score below threshold.");
    expect(html).toContain("/decisions?decisionId=decision-1");
    expect(html).toContain("/decisions?company=Ticimax");
    expect(html).toContain("/decisions?jobUrl=https%3A%2F%2Fwww.linkedin.com%2Fjobs%2Fview%2F1");
  });

  it("renders a helpful empty state when no decisions match filters", () => {
    const html = renderToStaticMarkup(<DecisionsSection decisions={[]} />);

    expect(html).toContain("No decisions matched the selected filters yet.");
  });
});
