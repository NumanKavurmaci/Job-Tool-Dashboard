import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { OverviewAnalytics } from "@/src/components/dashboard/overview-analytics";

describe("OverviewAnalytics", () => {
  it("renders summary analytics, ratios, and highlights", () => {
    const html = renderToStaticMarkup(
      <OverviewAnalytics
        stats={{
          totalJobs: 12,
          totalReviews: 10,
          totalLogs: 8,
          applyCount: 3,
          skipCount: 7,
          avgScore: 58,
        }}
        reviews={[
          {
            id: "review-1",
            jobUrl: "https://www.linkedin.com/jobs/view/1",
            platform: "linkedin",
            source: "easy-apply-batch",
            status: "SKIPPED",
            score: 12,
            threshold: 60,
            decision: "SKIP",
            policyAllowed: 0,
            reasons: "[]",
            summary: "Policy blocked.",
            createdAt: "2026-03-29T12:00:00.000Z",
            title: "Frontend Developer",
            company: "Amaris Consulting",
            companyLinkedinUrl: null,
            location: "Istanbul",
          },
          {
            id: "review-2",
            jobUrl: "https://www.linkedin.com/jobs/view/2",
            platform: "linkedin",
            source: "easy-apply-batch",
            status: "SUBMITTED",
            score: 71,
            threshold: 60,
            decision: "APPLY",
            policyAllowed: 1,
            reasons: "[]",
            summary: "Good fit.",
            createdAt: "2026-03-29T12:10:00.000Z",
            title: "Full Stack Engineer",
            company: "Wide and Wise",
            companyLinkedinUrl: null,
            location: "Türkiye",
          },
        ]}
        firms={[
          {
            id: "firm-1",
            name: "Wide and Wise",
            logoUrl: null,
            linkedinUrl: "https://www.linkedin.com/company/wideandwise/life/",
            totalReviewedJobs: 4,
            appliedJobs: 1,
            skippedJobs: 3,
            decisionIdsJson: "[]",
            updatedAt: "2026-03-29T12:10:00.000Z",
          },
        ]}
        logs={[
          {
            id: "log-1",
            level: "INFO",
            scope: "linkedin.batch",
            message: "Batch finished.",
            runType: "easy-apply-batch",
            jobUrl: null,
            createdAt: "2026-03-29T12:00:00.000Z",
          },
          {
            id: "log-2",
            level: "WARN",
            scope: "linkedin.batch",
            message: "Duplicate skipped.",
            runType: "easy-apply-batch",
            jobUrl: null,
            createdAt: "2026-03-29T12:01:00.000Z",
          },
          {
            id: "log-3",
            level: "ERROR",
            scope: "linkedin.batch",
            message: "Something failed.",
            runType: "easy-apply-batch",
            jobUrl: null,
            createdAt: "2026-03-29T12:02:00.000Z",
          },
        ]}
        artifacts={[
          {
            name: "2026-03-29T12-00-00-easy-apply-batch.json",
            category: "batch-runs",
            path: "C:\\artifacts\\batch.json",
            preview: "{ }",
            updatedAt: "2026-03-29T12:00:00.000Z",
          },
        ]}
      />,
    );

    expect(html).toContain("Decision mix and operational pulse");
    expect(html).toContain("Apply");
    expect(html).toContain("30%");
    expect(html).toContain("Skip");
    expect(html).toContain("70%");
    expect(html).toContain("System log mix");
    expect(html).toContain("Wide and Wise");
    expect(html).toContain("2026-03-29T12-00-00-easy-apply-batch.json");
    expect(html).toContain("There are 1 recent error-level system logs worth checking");
  });

  it("renders empty-state narrative when there is no operational data", () => {
    const html = renderToStaticMarkup(
      <OverviewAnalytics
        stats={{
          totalJobs: 0,
          totalReviews: 0,
          totalLogs: 0,
          applyCount: 0,
          skipCount: 0,
          avgScore: null,
        }}
        reviews={[]}
        firms={[]}
        logs={[]}
        artifacts={[]}
      />,
    );

    expect(html).toContain("0%");
    expect(html).toContain("n/a");
    expect(html).toContain("No review-source breakdown has been captured yet.");
    expect(html).toContain("No company data yet");
    expect(html).toContain("No artifacts captured yet");
    expect(html).toContain("No recent error-level logs were captured in the current snapshot.");
    expect(html).toContain("Company-level aggregation will show up here once the engine has persisted firm snapshots.");
  });
});
