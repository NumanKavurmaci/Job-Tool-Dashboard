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

function queueSearchStatements(responses: unknown[]) {
  let index = 0;
  prepareMock.mockImplementation(() => {
    const response = responses[index++];
    return {
      all: vi.fn(() => response),
      get: vi.fn(() => response),
    };
  });
}

describe("searchCollections query orchestration", () => {
  beforeEach(() => {
    vi.resetModules();
    prepareMock.mockReset();
    closeMock.mockReset();
    DatabaseMock.mockClear();
  });

  it("returns an empty array for queries shorter than 2 characters and never opens sqlite", async () => {
    const { searchCollections } = await import("@/lib/engine-db");

    expect(searchCollections("a")).toEqual([]);
    expect(searchCollections({ query: " " })).toEqual([]);
    expect(DatabaseMock).toHaveBeenCalledTimes(2);
    expect(closeMock).toHaveBeenCalledTimes(2);
  });

  it("expands all collections by default and queries every search table", async () => {
    queueSearchStatements([[], [], [], [], [], [], []]);

    const { searchCollections } = await import("@/lib/engine-db");
    const result = searchCollections("acme");

    expect(result).toEqual([]);
    expect(prepareMock).toHaveBeenCalledTimes(7);
    expect(closeMock).toHaveBeenCalledOnce();
  });

  it("queries only the explicitly requested collection set", async () => {
    queueSearchStatements([[]]);

    const { searchCollections } = await import("@/lib/engine-db");
    searchCollections({
      query: "acme",
      collections: ["companies"],
      filters: ["applied"],
      sort: "newest",
      limitPerCollection: 4,
    });

    expect(prepareMock).toHaveBeenCalledTimes(1);
    expect(String(prepareMock.mock.calls[0]?.[0])).toContain("FROM Firm");
  });

  it("does not query answer-cache when any search filter is active", async () => {
    queueSearchStatements([[]]);

    const { searchCollections } = await import("@/lib/engine-db");
    searchCollections({
      query: "work authorization",
      collections: ["answer-cache", "logs"],
      filters: ["error"],
      sort: "newest",
    });

    expect(prepareMock).toHaveBeenCalledTimes(1);
    expect(String(prepareMock.mock.calls[0]?.[0])).toContain("FROM SystemLog");
  });

  it("queries answer-cache when no filters are active", async () => {
    queueSearchStatements([
      [
        {
          id: "cache-1",
          normalizedQuestion: "work authorization",
          label: "Work authorization",
          questionType: "yes_no",
          updatedAt: "2026-03-29T07:00:00.000Z",
        },
      ],
    ]);

    const { searchCollections } = await import("@/lib/engine-db");
    const result = searchCollections({
      query: "work authorization",
      collections: ["answer-cache"],
      sort: "newest",
    });

    expect(prepareMock).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(1);
    expect(result[0]?.collection).toBe("answer-cache");
    expect(result[0]?.title).toBe("Work authorization");
  });

  it("passes the requested limit through to the SQL layer", async () => {
    queueSearchStatements([[]]);

    const { searchCollections } = await import("@/lib/engine-db");
    searchCollections({
      query: "acme",
      collections: ["jobs"],
      limitPerCollection: 9,
    });

    const statement = prepareMock.mock.results[0]?.value;
    expect(statement.all).toHaveBeenCalledWith("%acme%", "%acme%", "%acme%", "%acme%", 9);
  });

  it("includes the right filter clauses for jobs, reviews, decisions, companies, answers, and logs", async () => {
    queueSearchStatements([[], [], [], [], [], []]);

    const { searchCollections } = await import("@/lib/engine-db");
    searchCollections({
      query: "acme",
      collections: ["jobs", "reviews", "decisions", "companies", "answers", "logs"],
      filters: ["applied", "skipped", "error", "pending"],
      sort: "newest",
    });

    const sql = prepareMock.mock.calls.map((call) => String(call[0])).join("\n---\n");
    expect(sql).toContain("JobReviewHistory h WHERE h.jobUrl = JobPosting.url");
    expect(sql).toContain("h.status IN ('VIEWED', 'EVALUATED', 'READY_TO_SUBMIT')");
    expect(sql).toContain("d.decision = 'APPLY'");
    expect(sql).toContain("d.decision = 'SKIP'");
    expect(sql).toContain("d.policyAllowed = 0");
    expect(sql).toContain("appliedJobs > 0");
    expect(sql).toContain("skippedJobs > 0");
    expect(sql).toContain("l.level = 'ERROR'");
    expect(sql).toContain("level = 'ERROR'");
    expect(sql).toContain("LIKE '%retry%'");
  });
});
