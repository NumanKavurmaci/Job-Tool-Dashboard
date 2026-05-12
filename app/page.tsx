import { OverviewLinks } from "@/components/dashboard/overview-links";
import { OverviewPanel } from "@/components/dashboard/overview-panel";
import { PageIntro } from "@/components/dashboard/page-intro";
import { PageShell } from "@/components/dashboard/page-shell";
import { StatsOverview } from "@/components/dashboard/stats-overview";
import { readDashboardStats } from "@/lib/engine-db";
import { getEngineRoot } from "@/lib/engine-paths";

export const dynamic = "force-dynamic";

export default function HomePage() {
  const stats = readDashboardStats();
  const engineRoot = getEngineRoot();

  return (
    <PageShell>
      <PageIntro
        eyebrow="Overview"
        title="A cleaner command center for the engine's latest output."
        subtitle="This homepage stays intentionally light. Use the quick stats here, then jump into dedicated pages when you want the full story."
      />
      <StatsOverview stats={stats} />
      <OverviewPanel engineRoot={engineRoot} stats={stats} />
      <OverviewLinks />
    </PageShell>
  );
}
