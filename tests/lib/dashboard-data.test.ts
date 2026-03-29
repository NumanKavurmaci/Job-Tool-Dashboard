import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/engine-paths", () => ({
  getEngineRoot: vi.fn(() => "C:\\engine"),
}));

vi.mock("@/lib/engine-artifacts", () => ({
  readRecentArtifacts: vi.fn(() => [{ name: "batch.json", category: "batch-runs" }]),
}));

vi.mock("@/lib/engine-db", () => ({
  readDashboardStats: vi.fn(() => ({
    totalJobs: 10,
    totalReviews: 8,
    totalLogs: 4,
    applyCount: 2,
    skipCount: 6,
    avgScore: 55,
  })),
  readRecentFirms: vi.fn(() => [{ id: "firm-1", name: "Acme" }]),
  readRecentDecisions: vi.fn(() => [{ id: "decision-1", decision: "SKIP" }]),
  readPreparedAnswerSets: vi.fn(() => [{ id: "prepared-1" }]),
  readAnswerCache: vi.fn(() => [{ id: "cache-1" }]),
  readRecentReviews: vi.fn(() => [{ id: "review-1" }]),
  readRecentLogs: vi.fn(() => [{ id: "log-1" }]),
}));

import { getDashboardData } from "@/lib/dashboard-data";

describe("dashboard data", () => {
  it("aggregates data from all read-only sources", () => {
    const data = getDashboardData();

    expect(data.engineRoot).toBe("C:\\engine");
    expect(data.stats.totalJobs).toBe(10);
    expect(data.firms[0]).toMatchObject({ id: "firm-1", name: "Acme" });
    expect(data.decisions[0]).toMatchObject({ id: "decision-1", decision: "SKIP" });
    expect(data.preparedAnswerSets[0]).toMatchObject({ id: "prepared-1" });
    expect(data.answerCache[0]).toMatchObject({ id: "cache-1" });
    expect(data.reviews[0]).toMatchObject({ id: "review-1" });
    expect(data.logs[0]).toMatchObject({ id: "log-1" });
    expect(data.artifacts[0]).toMatchObject({ name: "batch.json", category: "batch-runs" });
  });
});
