import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DashboardNav } from "@/src/components/dashboard/dashboard-nav";

describe("DashboardNav", () => {
  it("links the top-left dashboard title to the overview page", () => {
    const html = renderToStaticMarkup(<DashboardNav />);

    expect(html).toContain('href="/"');
    expect(html).toContain("Job Tool Dashboard");
  });
});
