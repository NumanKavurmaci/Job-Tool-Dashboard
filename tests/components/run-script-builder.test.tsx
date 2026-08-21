import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RunScriptBuilder } from "@/src/components/dashboard/run-script-builder";

describe("RunScriptBuilder", () => {
  it("renders dashboard run controls and the CLI fallback for the default batch script", () => {
    const html = renderToStaticMarkup(<RunScriptBuilder />);

    expect(html).toContain("Run from dashboard");
    expect(html).toContain("Two isolated slots are available");
    expect(html).toContain("0/2 are active");
    expect(html).toContain("Both run slots are available");
    expect(html).toContain("Start Run");
    expect(html).toContain("Local readiness");
    expect(html).toContain("Latest job outcomes");
    expect(html).toContain("Showing the latest persisted outcomes even after the dashboard process restarts.");
    expect(html).toContain("No persisted job outcomes are available yet.");
    expect(html).toContain("Generated PowerShell wrapper");
    expect(html).toContain("await main([&#x27;apply-batch&#x27;, &#x27;https://www.linkedin.com/jobs/collections/hiring-in-network&#x27;, &#x27;--count&#x27;, &#x27;25&#x27;, &#x27;--score-threshold&#x27;, &#x27;40&#x27;, &#x27;--resume&#x27;, &#x27;./user/resume.pdf&#x27;, &#x27;--dry-run&#x27;], appDeps);");
  });

  it("keeps command preview readable while the generated script stays executable", () => {
    const html = renderToStaticMarkup(<RunScriptBuilder />);

    expect(html).toContain("Command Preview");
    expect(html).toContain("apply-batch https://www.linkedin.com/jobs/collections/hiring-in-network --count 25 --score-threshold 40 --resume ./user/resume.pdf --dry-run");
    expect(html).toContain("Copy Script");
  });

  it("keeps the common batch flows visible and tucks the rest under advanced scripts", () => {
    const html = renderToStaticMarkup(<RunScriptBuilder />);

    expect(html).toContain("Primary scripts");
    expect(html).toContain("Explore Batch");
    expect(html).toContain("Apply Batch");
    expect(html).toContain("Advanced scripts");
    expect(html).not.toContain("Dashboard Snapshot");
  });
});
