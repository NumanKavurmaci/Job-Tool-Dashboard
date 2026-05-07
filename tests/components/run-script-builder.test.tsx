import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { RunScriptBuilder } from "@/src/components/dashboard/run-script-builder";

describe("RunScriptBuilder", () => {
  it("renders a quoted PowerShell wrapper for the default batch script with a dry-run flag", () => {
    const html = renderToStaticMarkup(<RunScriptBuilder />);

    expect(html).toContain("Generated PowerShell wrapper");
    expect(html).toContain("await main([&#x27;apply-batch&#x27;, &#x27;https://www.linkedin.com/jobs/collections/hiring-in-network&#x27;, &#x27;--count&#x27;, &#x27;25&#x27;, &#x27;--score-threshold&#x27;, &#x27;40&#x27;, &#x27;--resume&#x27;, &#x27;./user/resume.pdf&#x27;, &#x27;--dry-run&#x27;], appDeps);");
  });

  it("keeps command preview readable while the generated script stays executable", () => {
    const html = renderToStaticMarkup(<RunScriptBuilder />);

    expect(html).toContain("Command Preview");
    expect(html).toContain("apply-batch https://www.linkedin.com/jobs/collections/hiring-in-network --count 25 --score-threshold 40 --resume ./user/resume.pdf --dry-run");
    expect(html).toContain("Copy Script");
  });
});
