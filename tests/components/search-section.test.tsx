import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SearchSection } from "@/src/components/dashboard/search-section";

describe("SearchSection", () => {
  it("renders grouped results under separate collection headings", () => {
    const html = renderToStaticMarkup(
      <SearchSection
        query="wide"
        selectedCollections={["all"]}
        selectedFilters={["applied"]}
        sort="top-score"
        results={[
          {
            id: "job-1",
            collection: "jobs",
            title: "Full Stack Engineer",
            subtitle: "Wide and Wise",
            body: "Türkiye",
            createdAt: "2026-03-29T12:00:00.000Z",
            primaryUrl: "https://www.linkedin.com/jobs/view/1",
            secondaryUrl: "/decisions?jobUrl=https%3A%2F%2Fwww.linkedin.com%2Fjobs%2Fview%2F1",
            secondaryLabel: "View related decisions",
            score: 88,
            decision: "APPLY",
            status: "SUBMITTED",
          },
          {
            id: "firm-1",
            collection: "companies",
            title: "Wide and Wise",
            subtitle: "4 reviewed • 1 apply • 3 skip",
            body: "https://www.linkedin.com/company/wideandwise/life/",
            createdAt: "2026-03-29T12:01:00.000Z",
            primaryUrl: "https://www.linkedin.com/company/wideandwise/life/",
            secondaryUrl: "/companies",
            secondaryLabel: "Open companies view",
          },
        ]}
      />,
    );

    expect(html).toContain("Jobs");
    expect(html).toContain("Companies");
    expect(html).toContain("Full Stack Engineer");
    expect(html).toContain("Wide and Wise");
    expect(html).toContain("View related decisions");
    expect(html).toContain("Open companies view");
    expect(html).toContain("Collections");
    expect(html).toContain("Filters");
    expect(html).toContain("Top score");
    expect(html).toContain("Score 88");
    expect(html).toContain("SUBMITTED");
  });

  it("renders a helpful empty prompt before a real query", () => {
    const html = renderToStaticMarkup(
      <SearchSection
        query=""
        selectedCollections={["all"]}
        selectedFilters={[]}
        sort="newest"
        results={[]}
      />,
    );
    expect(html).toContain("Enter at least 2 characters");
  });

  it("renders the no-results state for real queries with no matches", () => {
    const html = renderToStaticMarkup(
      <SearchSection
        query="zympler"
        selectedCollections={["companies"]}
        selectedFilters={["error"]}
        sort="newest"
        results={[]}
      />,
    );

    expect(html).toContain("No matches were found");
    expect(html).toContain("zympler");
  });

  it("keeps the selected collection, filter, and sort controls checked in the markup", () => {
    const html = renderToStaticMarkup(
      <SearchSection
        query="acme"
        selectedCollections={["companies", "logs"]}
        selectedFilters={["error", "pending"]}
        sort="company-az"
        results={[]}
      />,
    );

    expect(html).toContain('name="collection" checked="" value="companies"');
    expect(html).toContain('name="collection" checked="" value="logs"');
    expect(html).toContain('name="filter" checked="" value="error"');
    expect(html).toContain('name="filter" checked="" value="pending"');
    expect(html).toContain('<option value="company-az" selected="">Company A-Z</option>');
  });

  it("renders apply, skip, warn, and error badges with their statuses", () => {
    const html = renderToStaticMarkup(
      <SearchSection
        query="engineer"
        selectedCollections={["all"]}
        selectedFilters={[]}
        sort="newest"
        results={[
          {
            id: "job-apply",
            collection: "jobs",
            title: "Applied Role",
            subtitle: "Acme",
            body: null,
            createdAt: "2026-03-29T12:00:00.000Z",
            primaryUrl: "https://www.linkedin.com/jobs/view/1",
            secondaryUrl: null,
            secondaryLabel: null,
            score: 88,
            decision: "APPLY",
            status: "SUBMITTED",
          },
          {
            id: "job-skip",
            collection: "jobs",
            title: "Skipped Role",
            subtitle: "Beta",
            body: null,
            createdAt: "2026-03-29T11:00:00.000Z",
            primaryUrl: "https://www.linkedin.com/jobs/view/2",
            secondaryUrl: null,
            secondaryLabel: null,
            score: 10,
            decision: "SKIP",
            status: "SKIPPED",
          },
          {
            id: "job-pending",
            collection: "jobs",
            title: "Pending Role",
            subtitle: "Gamma",
            body: null,
            createdAt: "2026-03-29T10:00:00.000Z",
            primaryUrl: "https://www.linkedin.com/jobs/view/3",
            secondaryUrl: null,
            secondaryLabel: null,
            score: 55,
            decision: "APPLY",
            status: "READY_TO_SUBMIT",
          },
          {
            id: "log-error",
            collection: "logs",
            title: "ERROR • linkedin.batch",
            subtitle: "easy-apply-batch",
            body: "Submit failed",
            createdAt: "2026-03-29T09:00:00.000Z",
            primaryUrl: "https://www.linkedin.com/jobs/view/4",
            secondaryUrl: "/",
            secondaryLabel: "Open overview",
            level: "ERROR",
            status: "ERROR",
          },
        ]}
      />,
    );

    expect(html).toContain("SUBMITTED");
    expect(html).toContain("SKIPPED");
    expect(html).toContain("READY_TO_SUBMIT");
    expect(html).toContain("ERROR");
    expect(html).toContain("Open overview");
  });
});
