import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RunScriptBuilder } from "@/src/components/dashboard/run-script-builder";

describe("RunScriptBuilder", () => {
  it("renders a quoted PowerShell wrapper for the default dry-run script", () => {
    const html = renderToStaticMarkup(<RunScriptBuilder />);

    expect(html).toContain("Generated PowerShell wrapper");
    expect(html).toContain("await main([&#x27;easy-apply-dry-run&#x27;, &#x27;https://www.linkedin.com/jobs/collections/top-applicant&#x27;, &#x27;25&#x27;, &#x27;--score-threshold&#x27;, &#x27;40&#x27;], appDeps);");
  });

  it("keeps command preview readable while the generated script stays executable", () => {
    const html = renderToStaticMarkup(<RunScriptBuilder />);

    expect(html).toContain("Command Preview");
    expect(html).toContain("easy-apply-dry-run https://www.linkedin.com/jobs/collections/top-applicant 25 --score-threshold 40");
    expect(html).toContain("Copy Script");
  });
});
