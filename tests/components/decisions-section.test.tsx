import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DecisionsSection } from "@/src/components/dashboard/decisions-section";

describe("DecisionsSection", () => {
  it("renders detailed decision cards with threshold, reasons, and normalized job signals", () => {
    const html = renderToStaticMarkup(
      <DecisionsSection
        decisions={[
          {
            id: "decision-1",
            decision: "SKIP",
            score: 41,
            threshold: 60,
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
            normalizedJson: JSON.stringify({
              remoteType: "remote",
              seniority: "mid",
              yearsRequired: 3,
              applicationType: "easy_apply",
              openQuestionsCount: 0,
              technologies: ["Node.js", "TypeScript", "React"],
              mustHaveSkills: ["CI/CD"],
              niceToHaveSkills: ["Kafka"],
            }),
          },
        ]}
      />,
    );

    expect(html).toContain("System Engineer");
    expect(html).toContain('href="https://www.linkedin.com/jobs/view/1"');
    expect(html).toContain("Ticimax");
    expect(html).toContain("Istanbul, Türkiye");
    expect(html).toContain("Policy blocked");
    expect(html).toContain("Threshold 60");
    expect(html).toContain("Falls below the active threshold of 60.");
    expect(html).toContain("Only remote roles are allowed.");
    expect(html).toContain("Score below threshold.");
    expect(html).toContain("Workplace: Remote");
    expect(html).toContain("Seniority: Mid");
    expect(html).toContain("Experience: 3+ years");
    expect(html).toContain("Node.js");
    expect(html).toContain("CI/CD");
    expect(html).toContain("Kafka");
    expect(html).toContain("/decisions?decisionId=decision-1");
    expect(html).toContain("/decisions?company=Ticimax");
    expect(html).toContain("/decisions?jobUrl=https%3A%2F%2Fwww.linkedin.com%2Fjobs%2Fview%2F1");
  });

  it("renders a helpful empty state when no decisions match filters", () => {
    const html = renderToStaticMarkup(<DecisionsSection decisions={[]} />);

    expect(html).toContain("No decisions matched the selected filters yet.");
  });

  it("renders safe fallbacks when normalized payloads and links are missing", () => {
    const html = renderToStaticMarkup(
      <DecisionsSection
        decisions={[
          {
            id: "decision-2",
            decision: "APPLY",
            score: 88,
            threshold: null,
            policyAllowed: 1,
            reasons: "Single string reason",
            createdAt: "2026-03-29T12:30:00.000Z",
            jobPostingId: "job-2",
            jobUrl: "https://www.linkedin.com/jobs/view/2",
            title: null,
            company: null,
            companyLogoUrl: null,
            companyLinkedinUrl: null,
            location: null,
            normalizedJson: "{bad json}",
          },
        ]}
      />,
    );

    expect(html).toContain("Unknown title");
    expect(html).toContain("Unknown company");
    expect(html).toContain("High-confidence fit based on the captured signals.");
    expect(html).toContain("No threshold captured");
    expect(html).toContain("Policy pass");
    expect(html).toContain("Normalized job signals were not captured for this decision.");
    expect(html).toContain("No technologies captured.");
    expect(html).toContain("No must-have skills captured.");
    expect(html).toContain("No nice-to-have skills captured.");
    expect(html).toContain("Single string reason");
  });
});
