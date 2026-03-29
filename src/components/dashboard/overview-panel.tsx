import type { DashboardData } from "@/lib/dashboard-data";
import { Card, SectionTitle } from "@/components/ui";

export function OverviewPanel({
  engineRoot,
  stats,
}: Pick<DashboardData, "engineRoot" | "stats">) {
  return (
    <Card>
      <SectionTitle
        eyebrow="Workspace"
        title="Engine overview"
        subtitle="A compact summary of what the engine has already stored and processed."
      />
      <div className="mt-5 grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
        <div className="space-y-3">
          <p className="text-sm text-muted">
            Engine root: <span className="font-mono text-slate-300">{engineRoot}</span>
          </p>
          <p className="max-w-3xl text-sm leading-7 text-muted">
            The dashboard reads the existing Job Tool database, logs, and artifacts without
            mutating them. Use the dedicated pages for detailed review history, artifacts, and
            company snapshots.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <div className="rounded-2xl border border-line bg-panelSoft/80 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted">Jobs / Reviews</p>
            <p className="mt-2 text-xl font-semibold text-text">
              {stats.totalJobs} / {stats.totalReviews}
            </p>
          </div>
          <div className="rounded-2xl border border-line bg-panelSoft/80 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted">Apply / Skip</p>
            <p className="mt-2 text-xl font-semibold text-text">
              {stats.applyCount} / {stats.skipCount}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
