import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { SearchSection } from "@/src/components/dashboard/search-section";

describe("SearchSection", () => {
  it("renders grouped results under separate collection headings", () => {
    const html = renderToStaticMarkup(
      <SearchSection
        query="wide"
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
  });

  it("renders a helpful empty prompt before a real query", () => {
    const html = renderToStaticMarkup(<SearchSection query="" results={[]} />);
    expect(html).toContain("Enter at least 2 characters");
  });
});
