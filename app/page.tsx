import { OverviewLinks } from "@/components/dashboard/overview-links";
import { OverviewAnalytics } from "@/components/dashboard/overview-analytics";
import { HomeHighlightsSection } from "@/components/dashboard/home-highlights-section";
import { OverviewPanel } from "@/components/dashboard/overview-panel";
import { PageIntro } from "@/components/dashboard/page-intro";
import { PageShell } from "@/components/dashboard/page-shell";
import { LogsSection } from "@/components/dashboard/logs-section";
import { StatsOverview } from "@/components/dashboard/stats-overview";
import { getDashboardData } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const data = getDashboardData();

  return (
    <PageShell>
      <PageIntro
        eyebrow="Overview"
        title="A high-level readout of what the engine has already accomplished."
        subtitle="Use this page for the broad picture, then jump into dedicated views for review history, generated artifacts, and company-level tracking."
      />
      <StatsOverview stats={data.stats} />
      <OverviewAnalytics
        stats={data.stats}
        reviews={data.reviews}
        firms={data.firms}
        logs={data.logs}
        artifacts={data.artifacts}
      />
      <OverviewPanel engineRoot={data.engineRoot} stats={data.stats} />
      <HomeHighlightsSection
        topApplications={data.topApplications}
        incompleteApplications={data.incompleteApplications}
        topMissedHighScoreJobs={data.topMissedHighScoreJobs}
        topPendingApprovedJobs={data.topPendingApprovedJobs}
      />
      <OverviewLinks />
      <LogsSection logs={data.logs} />
    </PageShell>
  );
}
