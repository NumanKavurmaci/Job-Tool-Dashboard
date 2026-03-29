import { beforeEach, describe, expect, it, vi } from "vitest";

const prepareMock = vi.fn();
const closeMock = vi.fn();
const DatabaseMock = vi.fn(
  class {
    prepare = prepareMock;
    close = closeMock;
  },
);

vi.mock("better-sqlite3", () => ({
  default: DatabaseMock,
}));

function queueStatements(
  responses: Array<{
    get?: unknown;
    all?: unknown;
  }>,
) {
  let index = 0;
  prepareMock.mockImplementation(() => {
    const response = responses[index++] ?? {};
    return {
      get: vi.fn(() => response.get),
      all: vi.fn(() => response.all),
    };
  });
}

describe("engine-db", () => {
  beforeEach(() => {
    vi.resetModules();
    prepareMock.mockReset();
    closeMock.mockReset();
    DatabaseMock.mockClear();
  });

  it("reads dashboard stats and closes the database", async () => {
    queueStatements([
      {
        get: {
          totalJobs: 12,
          totalReviews: 9,
          totalLogs: 5,
          applyCount: 3,
          skipCount: 6,
          avgScore: 58,
        },
      },
    ]);

    const { readDashboardStats } = await import("@/lib/engine-db");
    expect(readDashboardStats()).toEqual({
      totalJobs: 12,
      totalReviews: 9,
      totalLogs: 5,
      applyCount: 3,
      skipCount: 6,
      avgScore: 58,
    });
    expect(closeMock).toHaveBeenCalledOnce();
  });

  it("reads the recent review, log, firm, answer, and cache collections", async () => {
    queueStatements([
      {
        all: [
          {
            id: "review-1",
            jobUrl: "https://www.linkedin.com/jobs/view/1",
            platform: "linkedin",
            source: "easy-apply-batch",
            status: "SKIPPED",
            score: 20,
            threshold: 40,
            decision: "SKIP",
            policyAllowed: 1,
            reasons: "[]",
            summary: "Review summary",
            createdAt: "2026-03-29T10:00:00.000Z",
            title: "Backend Engineer",
            company: "Acme",
            companyLinkedinUrl: "https://linkedin.com/company/acme",
            location: "Remote",
          },
        ],
      },
      {
        all: [
          {
            id: "log-1",
            level: "INFO",
            scope: "engine",
            message: "Finished",
            runType: "easy-apply-dry-run",
            jobUrl: null,
            createdAt: "2026-03-29T10:00:00.000Z",
          },
        ],
      },
      {
        all: [
          {
            id: "firm-1",
            name: "Acme",
            logoUrl: null,
            linkedinUrl: null,
            totalReviewedJobs: 4,
            appliedJobs: 1,
            skippedJobs: 3,
            decisionIdsJson: "[]",
            updatedAt: "2026-03-29T10:00:00.000Z",
          },
        ],
      },
      {
        all: [
          {
            id: "prepared-1",
            jobPostingId: null,
            createdAt: "2026-03-29T10:00:00.000Z",
            questionsJson: "[]",
            answersJson: "[]",
            jobUrl: null,
            title: null,
            company: null,
          },
        ],
      },
      {
        all: [
          {
            id: "cache-1",
            normalizedQuestion: "first name",
            label: "First Name",
            questionType: "contact_info",
            strategy: "deterministic",
            answerJson: "\"Numan\"",
            confidenceLabel: "high",
            source: "candidate-profile",
            notesJson: null,
            createdAt: "2026-03-29T10:00:00.000Z",
            updatedAt: "2026-03-29T10:00:00.000Z",
          },
        ],
      },
    ]);

    const {
      readRecentReviews,
      readRecentLogs,
      readRecentFirms,
      readPreparedAnswerSets,
      readAnswerCache,
    } = await import("@/lib/engine-db");

    expect(readRecentReviews(1)[0]?.company).toBe("Acme");
    expect(readRecentLogs(1)[0]?.message).toBe("Finished");
    expect(readRecentFirms(1)[0]?.totalReviewedJobs).toBe(4);
    expect(readPreparedAnswerSets(1)[0]?.id).toBe("prepared-1");
    expect(readAnswerCache(1)[0]?.normalizedQuestion).toBe("first name");
    expect(closeMock).toHaveBeenCalledTimes(5);
  });

  it("applies decision filters and returns recent decisions", async () => {
    queueStatements([
      {
        all: [
          {
            id: "decision-1",
            decision: "APPLY",
            score: 71,
            threshold: 40,
            policyAllowed: 1,
            reasons: "[]",
            createdAt: "2026-03-29T10:00:00.000Z",
            jobPostingId: "job-1",
            jobUrl: "https://www.linkedin.com/jobs/view/1",
            title: "Backend Engineer",
            company: "Acme",
            companyLogoUrl: null,
            companyLinkedinUrl: null,
            location: "Remote",
            normalizedJson: "{}",
          },
        ],
      },
    ]);

    const { readRecentDecisions } = await import("@/lib/engine-db");
    const result = readRecentDecisions({
      limit: 5,
      decisionId: "decision-1",
      company: "Acme",
      jobUrl: "https://www.linkedin.com/jobs/view/1",
    });

    expect(result[0]?.decision).toBe("APPLY");
    expect(prepareMock).toHaveBeenCalled();
    expect(closeMock).toHaveBeenCalledOnce();
  });

  it("searches across all collections and sorts newest first", async () => {
    queueStatements([
      {
        all: [
          {
            id: "job-1",
            url: "https://www.linkedin.com/jobs/view/1",
            title: "Backend Engineer",
            company: "Acme",
            location: "Remote",
            createdAt: "2026-03-29T09:00:00.000Z",
          },
        ],
      },
      {
        all: [
          {
            id: "review-1",
            jobUrl: "https://www.linkedin.com/jobs/view/1",
            summary: "Policy blocked.",
            source: "easy-apply-dry-run",
            createdAt: "2026-03-29T09:30:00.000Z",
            title: "Backend Engineer",
            company: "Acme",
          },
        ],
      },
      {
        all: [
          {
            id: "decision-1",
            decision: "APPLY",
            score: 65,
            createdAt: "2026-03-29T10:30:00.000Z",
            jobUrl: "https://www.linkedin.com/jobs/view/1",
            title: "Backend Engineer",
            company: "Acme",
          },
        ],
      },
      {
        all: [
          {
            id: "firm-1",
            name: "Acme",
            linkedinUrl: "https://linkedin.com/company/acme",
            totalReviewedJobs: 3,
            appliedJobs: 1,
            skippedJobs: 2,
            updatedAt: "2026-03-29T08:00:00.000Z",
          },
        ],
      },
      {
        all: [
          {
            id: "prepared-1",
            createdAt: "2026-03-29T11:00:00.000Z",
            questionsJson: "[{\"label\":\"Work authorization\"}]",
            jobUrl: "https://www.linkedin.com/jobs/view/1",
            title: "Backend Engineer",
            company: "Acme",
          },
        ],
      },
      {
        all: [
          {
            id: "cache-1",
            normalizedQuestion: "work authorization",
            label: "Work authorization",
            questionType: "yes_no",
            updatedAt: "2026-03-29T07:00:00.000Z",
          },
        ],
      },
      {
        all: [
          {
            id: "log-1",
            level: "ERROR",
            scope: "engine",
            message: "Something failed",
            runType: "easy-apply-dry-run",
            jobUrl: "https://www.linkedin.com/jobs/view/1",
            createdAt: "2026-03-29T12:00:00.000Z",
          },
        ],
      },
    ]);

    const { searchCollections } = await import("@/lib/engine-db");
    const result = searchCollections("acme", 3);

    expect(result.map((item) => item.collection)).toContain("jobs");
    expect(result.map((item) => item.collection)).toContain("reviews");
    expect(result.map((item) => item.collection)).toContain("decisions");
    expect(result.map((item) => item.collection)).toContain("companies");
    expect(result.map((item) => item.collection)).toContain("answers");
    expect(result.map((item) => item.collection)).toContain("answer-cache");
    expect(result.map((item) => item.collection)).toContain("logs");
    expect(result[0]?.collection).toBe("logs");
    expect(result[0]?.secondaryLabel).toBe("Open overview");
    expect(result.find((item) => item.collection === "jobs")?.secondaryLabel).toBe("View related decisions");
  });
});
