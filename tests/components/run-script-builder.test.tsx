import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { JobOutcome, RunScriptBuilder } from "@/src/components/dashboard/run-script-builder";

describe("RunScriptBuilder", () => {
  it("renders dashboard run controls and the CLI fallback for the default batch script", () => {
    const html = renderToStaticMarkup(<RunScriptBuilder />);

    expect(html).toContain("Run from dashboard");
    expect(html).toContain("Two isolated slots are available");
    expect(html).toContain("0/2 are active");
    expect(html).toContain("Both run slots are available");
    expect(html).toContain("Start LIVE Run");
    expect(html).toContain("Local readiness");
    expect(html).toContain("Latest job outcomes");
    expect(html).toContain("Showing the latest persisted outcomes even after the dashboard process restarts.");
    expect(html).toContain("No persisted job outcomes are available yet.");
    expect(html).toContain("Generated PowerShell wrapper");
    expect(html).toContain("await main([&#x27;apply-batch&#x27;, &#x27;https://www.linkedin.com/jobs/collections/hiring-in-network&#x27;, &#x27;--count&#x27;, &#x27;25&#x27;, &#x27;--score-threshold&#x27;, &#x27;40&#x27;, &#x27;--resume&#x27;, &#x27;./user/resume.pdf&#x27;, &#x27;--scoring&#x27;, &#x27;ai&#x27;], appDeps);");
    expect(html.indexOf("Latest job outcomes")).toBeLessThan(html.indexOf("Local readiness"));
  });

  it("keeps command preview readable while the generated script stays executable", () => {
    const html = renderToStaticMarkup(<RunScriptBuilder />);

    expect(html).toContain("Command Preview");
    expect(html).toContain("apply-batch https://www.linkedin.com/jobs/collections/hiring-in-network --count 25 --score-threshold 40 --resume ./user/resume.pdf --scoring ai");
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

  it("links a latest outcome title to its real job posting", () => {
    const jobUrl = "https://www.linkedin.com/jobs/view/4389593314";
    const html = renderToStaticMarkup(
      <JobOutcome
        review={{
          createdAt: "2026-08-31T12:00:00.000Z",
          jobUrl,
          status: "EVALUATED",
          score: 82,
          threshold: 40,
          decision: "APPLY",
          policyAllowed: 1,
          summary: "Strong match",
          title: "Senior Frontend Engineer",
          company: "Acme",
          location: "Remote",
        }}
      />,
    );

    expect(html).toContain(`href="${jobUrl}"`);
    expect(html).toContain("Senior Frontend Engineer at Acme");
    expect(html).toContain('target="_blank"');
  });

  it("marks an unconfirmed APPLY decision as not submitted after a live run finishes", () => {
    const html = renderToStaticMarkup(
      <JobOutcome
        executionMode="live"
        runStatus="completed"
        review={{
          createdAt: "2026-08-31T12:00:00.000Z",
          jobUrl: "https://reactjobs.io/react-jobs/hired/frontend-developer",
          status: "EVALUATED",
          score: 80,
          threshold: 40,
          decision: "APPLY",
          policyAllowed: 1,
          summary: "Score 80 meets the configured threshold of 40.",
          title: "Frontend Developer (Remote)",
          company: "Hired",
          location: "Remote",
        }}
      />,
    );

    expect(html).toContain("NOT SUBMITTED");
    expect(html).toContain("did not produce a confirmed submission");
  });

  it("uses the external apply badge and a specific handoff message for external applications", () => {
    const html = renderToStaticMarkup(
      <JobOutcome
        executionMode="live"
        runStatus="stopped"
        review={{
          createdAt: "2026-08-31T12:00:00.000Z",
          jobUrl: "https://www.linkedin.com/jobs/view/4461229300",
          status: "EVALUATED",
          score: 70,
          threshold: 40,
          decision: "APPLY",
          policyAllowed: 1,
          summary: "Score 70 meets the configured threshold of 40.",
          title: "Frontend Developer",
          company: "micro1",
          location: "Remote",
          applicationType: "external",
          externalApplyUrl: "https://jobs.micro1.ai/post/example",
        }}
      />,
    );

    expect(html).toContain("External Apply");
    expect(html).toContain("The run ended before submission was confirmed.");
    expect(html).not.toContain("NOT SUBMITTED");
    expect(html).not.toContain("The APPLY decision did not produce a confirmed submission.");
  });
});
