import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { DashboardData } from "@/lib/dashboard-data";
import type { EngineRunRecord } from "@/lib/engine-runner";
import type { RunProgressSummary } from "@/lib/run-progress";
import { Badge, Card, SectionTitle } from "@/src/components/ui";
import {
  ApplicationTypeBadge,
  normalizeApplicationType,
} from "@/src/components/dashboard/application-type-badge";
import { CompanyLogo } from "@/src/components/dashboard/company-logo";
import { DashboardHeader } from "@/src/components/dashboard/dashboard-header";
import { HomeHighlightsSection } from "@/src/components/dashboard/home-highlights-section";
import { HomeOperationsSection } from "@/src/components/dashboard/home-operations-section";
import { LogsSection } from "@/src/components/dashboard/logs-section";
import { OverviewLinks } from "@/src/components/dashboard/overview-links";
import { OverviewPanel } from "@/src/components/dashboard/overview-panel";
import { PageIntro } from "@/src/components/dashboard/page-intro";
import { PageShell } from "@/src/components/dashboard/page-shell";
import { SidebarSections } from "@/src/components/dashboard/sidebar-sections";
import { StatsOverview } from "@/src/components/dashboard/stats-overview";

const stats: DashboardData["stats"] = {
  totalJobs: 12,
  totalReviews: 18,
  totalLogs: 30,
  applyCount: 7,
  skipCount: 5,
  incompleteApplyCount: 2,
  recommendationCount: 4,
  avgScore: 72.6,
};

const highlight: DashboardData["topApplications"][number] = {
  id: "review-1",
  jobUrl: "https://jobs.example.com/role-1",
  status: "SUBMITTED",
  decision: "APPLY",
  score: 88,
  summary: "Strong skills match.",
  source: "apply-batch",
  createdAt: "2026-08-31T10:00:00.000Z",
  title: "Senior Engineer",
  company: "Acme",
  companyLinkedinUrl: null,
  location: "Remote",
};

function createRun(
  overrides: Partial<EngineRunRecord & { progress: RunProgressSummary | null }> = {},
): EngineRunRecord & { progress: RunProgressSummary | null } {
  return {
    id: "run-12345678",
    args: ["apply-batch", "https://www.linkedin.com/jobs/collections/easy-apply"],
    mode: "apply-batch",
    executionMode: "dry-run",
    correlationMode: "run-id",
    exclusiveResources: ["profile:linkedin"],
    command: "npm run dev -- apply-batch",
    cwd: "C:\\engine",
    startedAt: "2026-08-31T10:00:00.000Z",
    finishedAt: null,
    status: "running",
    exitCode: null,
    pid: 123,
    revision: 1,
    events: [],
    progress: {
      evaluatedCount: 1,
      skippedCount: 0,
      submittedCount: 0,
      failedCount: 0,
      applyDecisionCount: 1,
      terminalOutcome: null,
      currentActivity: {
        stage: "applying",
        label: "Applying Senior Engineer at Acme",
        detail: "Decision APPLY, score 88.",
        jobUrl: highlight.jobUrl,
        title: highlight.title,
        company: highlight.company,
        location: highlight.location,
        score: highlight.score,
        decision: highlight.decision,
        updatedAt: "2026-08-31T10:00:01.000Z",
      },
      latestArtifact: null,
      reviews: [],
    },
    ...overrides,
  };
}

describe("supporting dashboard components", () => {
  it("renders shared cards, headings, optional subtitles, and badge tones", () => {
    const html = renderToStaticMarkup(
      <Card className="custom-card">
        <SectionTitle eyebrow="Safety" title="Checks" subtitle="All systems inspected." />
        <SectionTitle eyebrow="Compact" title="No subtitle" />
        <Badge tone="warn">Needs attention</Badge>
      </Card>,
    );

    expect(html).toContain("custom-card");
    expect(html).toContain("All systems inspected.");
    expect(html).toContain("No subtitle");
    expect(html).toContain("Needs attention");
    expect(html).toContain("border-amber-400/30");
  });

  it.each([
    ["easy apply", "easy_apply"],
    ["Easy-Apply", "easy_apply"],
    ["external", "external"],
    ["external_apply", "external"],
    ["unknown", null],
    [null, null],
  ] as const)("normalizes application type %j to %j", (input, expected) => {
    expect(normalizeApplicationType(input)).toBe(expected);
  });

  it("renders distinct application badges and hides unknown values", () => {
    expect(renderToStaticMarkup(<ApplicationTypeBadge value="easy apply" />))
      .toContain("Easy Apply");
    expect(renderToStaticMarkup(<ApplicationTypeBadge value="external_apply" />))
      .toContain("External Apply");
    expect(renderToStaticMarkup(<ApplicationTypeBadge value="other" />)).toBe("");
  });

  it("renders a safe image logo link with lazy loading and no referrer", () => {
    const html = renderToStaticMarkup(
      <CompanyLogo
        company="Acme"
        logoUrl="https://cdn.example.com/acme.png"
        linkedinUrl="https://www.linkedin.com/company/acme"
      />,
    );

    expect(html).toContain('href="https://www.linkedin.com/company/acme"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noreferrer"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain('referrerPolicy="no-referrer"');
    expect(html).toContain('alt="Acme logo"');
  });

  it("falls back to an initial when no company logo or name is available", () => {
    const known = renderToStaticMarkup(
      <CompanyLogo company="beta" logoUrl={null} linkedinUrl={null} />,
    );
    const unknown = renderToStaticMarkup(
      <CompanyLogo company={null} logoUrl={null} linkedinUrl={null} />,
    );

    expect(known).toContain(">B</span>");
    expect(unknown).toContain(">U</span>");
    expect(known).not.toContain("<a");
  });

  it("renders workspace identity and page-intro copy", () => {
    const html = renderToStaticMarkup(
      <>
        <DashboardHeader engineRoot={"C:\\engine"} />
        <PageIntro eyebrow="Review" title="Inspect safely" subtitle="Read-only details." />
      </>,
    );

    expect(html).toContain("Job Tool Dashboard");
    expect(html).toContain("C:\\engine");
    expect(html).toContain("Inspect safely");
    expect(html).toContain("Read-only details.");
  });

  it("wraps page content with global navigation and the main landmark", () => {
    const html = renderToStaticMarkup(
      <PageShell><p>Page content</p></PageShell>,
    );

    expect(html).toContain("Job Tool Dashboard");
    expect(html).toContain("<main");
    expect(html).toContain("Page content");
  });

  it("composes artifact and log sidebar sections in their empty states", () => {
    const html = renderToStaticMarkup(<SidebarSections artifacts={[]} logs={[]} />);

    expect(html).toContain("Recent runs");
    expect(html).toContain("No generated artifacts have been captured yet.");
    expect(html).toContain("Recent system logs");
  });

  it("renders all homepage highlight empty states", () => {
    const html = renderToStaticMarkup(
      <HomeHighlightsSection
        topApplications={[]}
        incompleteApplications={[]}
        topMissedHighScoreJobs={[]}
        topPendingApprovedJobs={[]}
      />,
    );

    expect(html).toContain("No submitted applications have been recorded yet.");
    expect(html).toContain("No incomplete approved applications are currently visible.");
    expect(html).toContain("No failed high-scoring approved jobs are currently visible.");
    expect(html).toContain("No pending approved jobs are currently visible.");
  });

  it("renders a linked highlight with score, status, decision, and context", () => {
    const html = renderToStaticMarkup(
      <HomeHighlightsSection
        topApplications={[highlight]}
        incompleteApplications={[]}
        topMissedHighScoreJobs={[]}
        topPendingApprovedJobs={[]}
      />,
    );

    expect(html).toContain(`href="${highlight.jobUrl}"`);
    expect(html).toContain("Senior Engineer");
    expect(html).toContain("Acme");
    expect(html).toContain("Remote");
    expect(html).toContain("Score 88");
    expect(html).toContain("SUBMITTED");
    expect(html).toContain("APPLY");
    expect(html).toContain("Strong skills match.");
  });

  it("summarizes active runs and readiness blockers", () => {
    const secondRun = createRun({
      id: "run-87654321",
      mode: "score",
      status: "stopping",
      progress: null,
    });
    const html = renderToStaticMarkup(
      <HomeOperationsSection
        runs={[createRun(), secondRun]}
        incompleteCount={1}
        runBlockers={[{ key: "resume", label: "Resume", ok: false, detail: "Missing file" }]}
      />,
    );

    expect(html).toContain("2/2 engine runs active");
    expect(html).toContain("Applying Senior Engineer at Acme");
    expect(html).toContain("apply-batch");
    expect(html).toContain("score");
    expect(html).toContain("Resume");
    expect(html).toContain("Missing file");
    expect(html).toContain("1 incomplete application");
    expect(html).toContain('href="/run"');
  });

  it("shows the ready state and pluralizes incomplete applications", () => {
    const html = renderToStaticMarkup(
      <HomeOperationsSection runs={[]} incompleteCount={2} runBlockers={[]} />,
    );

    expect(html).toContain("Run control");
    expect(html).toContain("Primary apply-batch prerequisites are ready.");
    expect(html).toContain("2 incomplete applications");
    expect(html).toContain("Configure a run");
  });

  it("maps log levels to distinct tones and includes optional job context", () => {
    const logs: DashboardData["logs"] = [
      { id: "1", level: "ERROR", scope: "runner", message: "failed", runType: null, jobUrl: "https://jobs.example.com/1", createdAt: "2026-08-31T10:00:00Z" },
      { id: "2", level: "WARN", scope: "config", message: "missing", runType: null, jobUrl: null, createdAt: "2026-08-31T10:01:00Z" },
      { id: "3", level: "INFO", scope: "api", message: "ready", runType: null, jobUrl: null, createdAt: "2026-08-31T10:02:00Z" },
    ];
    const html = renderToStaticMarkup(<LogsSection logs={logs} />);

    expect(html).toContain("Recent system logs");
    expect(html).toContain("runner / https://jobs.example.com/1");
    expect(html).toContain("border-rose-400/30");
    expect(html).toContain("border-amber-400/30");
    expect(html).toContain("border-blue-400/30");
  });

  it("renders all deep-review navigation destinations", () => {
    const html = renderToStaticMarkup(<OverviewLinks />);

    for (const href of [
      "/run",
      "/search",
      "/recommendations",
      "/search?filter=incomplete&amp;collection=reviews",
      "/reviews",
      "/decisions",
      "/answers",
      "/artifacts",
      "/companies",
    ]) {
      expect(html).toContain(`href="${href}"`);
    }
  });

  it("renders overview totals and rounded score statistics", () => {
    const html = renderToStaticMarkup(
      <>
        <OverviewPanel engineRoot={"C:\\engine"} stats={stats} />
        <StatsOverview stats={stats} />
      </>,
    );

    expect(html).toContain("12 / 18");
    expect(html).toContain("7 / 5");
    expect(html).toContain("Tracked Jobs");
    expect(html).toContain("Incomplete Applications");
    expect(html).toContain(">73</p>");
  });

  it("renders n/a when no average score exists", () => {
    const html = renderToStaticMarkup(<StatsOverview stats={{ ...stats, avgScore: null }} />);
    expect(html).toContain(">n/a</p>");
  });
});
