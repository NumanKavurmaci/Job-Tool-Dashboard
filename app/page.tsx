import { OverviewLinks } from "@/components/dashboard/overview-links";
import { OverviewPanel } from "@/components/dashboard/overview-panel";
import { PageIntro } from "@/components/dashboard/page-intro";
import { PageShell } from "@/components/dashboard/page-shell";
import { StatsOverview } from "@/components/dashboard/stats-overview";
import { getDashboardData } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const data = getDashboardData();

  return (
    <PageShell>
      <PageIntro
        eyebrow="Overview"
        title="A cleaner command center for the engine's latest output."
        subtitle="This homepage stays intentionally light. Use the quick stats here, then jump into dedicated pages when you want the full story."
      />
      <StatsOverview stats={data.stats} />
      <OverviewPanel engineRoot={data.engineRoot} stats={data.stats} />
      <OverviewLinks />
    </PageShell>
  );
}
