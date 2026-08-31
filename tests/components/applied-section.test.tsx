import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AppliedSection, filterAppliedJobs } from "@/src/components/dashboard/applied-section";

const baseAppliedJob = {
  id: "applied-1",
  jobUrl: "https://www.linkedin.com/jobs/view/1/",
  platform: "linkedin",
  source: "easy-apply-batch",
  status: "SUBMITTED",
  score: 86,
  threshold: 40,
  decision: "APPLY",
  policyAllowed: 1,
  reasons: JSON.stringify(["Strong match"]),
  summary: "Application submitted successfully.",
  detailsJson: JSON.stringify({ easyApplyStatus: "submitted" }),
  dashboardRunId: "run-latest",
  createdAt: "2026-08-31T10:00:00.000Z",
  jobPostingId: "job-1",
  title: "Product Engineer",
  company: "Hired",
  companyLogoUrl: "https://media.licdn.com/hired-logo.png",
  companyLinkedinUrl: "https://www.linkedin.com/company/hiredddd/life",
  location: "Remote",
  normalizedJson: JSON.stringify({ applicationType: "easy_apply" }),
};

describe("AppliedSection", () => {
  it("renders submitted jobs with recommendation-style filters and apply type badges", () => {
    const html = renderToStaticMarkup(<AppliedSection appliedJobs={[baseAppliedJob]} />);

    expect(html).toContain('data-view-mode="grid"');
    expect(html).toContain("Last 7 days");
    expect(html).toContain("Latest run");
    expect(html).toContain("Last 3 runs");
    expect(html).toContain("Submitted");
    expect(html).toContain("AI approved");
    expect(html).toContain("Easy Apply");
    expect(html).toContain('src="https://media.licdn.com/hired-logo.png"');
  });

  it("renders external apply when the completed handoff is external", () => {
    const html = renderToStaticMarkup(
      <AppliedSection
        appliedJobs={[
          {
            ...baseAppliedJob,
            id: "applied-2",
            platform: "ashby",
            detailsJson: JSON.stringify({ externalFinalStage: "completed" }),
            normalizedJson: null,
          },
        ]}
      />,
    );

    expect(html).toContain("External Apply");
  });

  it("filters completed jobs by date and recent run", () => {
    const jobs = [
      baseAppliedJob,
      {
        ...baseAppliedJob,
        id: "applied-old",
        dashboardRunId: "run-old",
        createdAt: "2026-08-20T10:00:00.000Z",
      },
    ];

    expect(
      filterAppliedJobs({
        jobs,
        timeFilter: "last-7-days",
        runFilter: "latest",
        nowMs: Date.parse("2026-08-31T12:00:00.000Z"),
      }).map((job) => job.id),
    ).toEqual(["applied-1"]);
  });
});
