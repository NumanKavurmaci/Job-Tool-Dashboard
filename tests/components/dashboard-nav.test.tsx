import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DashboardNav } from "@/src/components/dashboard/dashboard-nav";

describe("DashboardNav", () => {
  it("links the top-left dashboard title to the overview page", () => {
    const html = renderToStaticMarkup(<DashboardNav />);

    expect(html).toContain('href="/"');
    expect(html).toContain("Job Tool Dashboard");
  });

  it("keeps secondary pages in a compact more menu", () => {
    const html = renderToStaticMarkup(<DashboardNav />);

    expect(html).toContain("Recommendations");
    expect(html).toContain("Artifacts");
    expect(html).toContain("More");
    expect(html).toContain('href="/reviews"');
    expect(html).toContain('href="/decisions"');
    expect(html).toContain('href="/answers"');
    expect(html).toContain('href="/companies"');
  });
});
