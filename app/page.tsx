import { HomeHighlightsSection } from "@/components/dashboard/home-highlights-section";
import { HomeOperationsSection } from "@/components/dashboard/home-operations-section";
import { OverviewLinks } from "@/components/dashboard/overview-links";
import { PageIntro } from "@/components/dashboard/page-intro";
import { PageShell } from "@/components/dashboard/page-shell";
import { StatsOverview } from "@/components/dashboard/stats-overview";
import { getDashboardData } from "@/lib/dashboard-data";
import { readEngineConfigStatus } from "@/lib/engine-status";
import { getRuns } from "@/lib/engine-runner";
import { getBlockingRunChecks } from "@/lib/run-readiness";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const data = getDashboardData();
  const configStatus = await readEngineConfigStatus();
  const runs = getRuns();
  const runBlockers = getBlockingRunChecks("apply-batch", configStatus.checks);

  return (
    <PageShell>
      <PageIntro
        eyebrow="Overview"
        title="Operate the engine from what needs attention now."
        subtitle="See the active run, unblock prerequisites, recover incomplete applications, then inspect deeper history when needed."
      />
      <HomeOperationsSection
        runs={runs}
        incompleteCount={data.stats.incompleteApplyCount}
        runBlockers={runBlockers}
      />
      <StatsOverview stats={data.stats} />
      <HomeHighlightsSection
        topApplications={data.topApplications}
        incompleteApplications={data.incompleteApplications}
        topMissedHighScoreJobs={data.topMissedHighScoreJobs}
        topPendingApprovedJobs={data.topPendingApprovedJobs}
      />
      <OverviewLinks />
    </PageShell>
  );
}
