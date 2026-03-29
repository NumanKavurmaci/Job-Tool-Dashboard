import type { DashboardData } from "@/lib/dashboard-data";
import { Badge, Card, SectionTitle } from "@/components/ui";

function safeRatio(value: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round((value / total) * 100)));
}

function formatScore(value: number | null) {
  return value == null ? "n/a" : `${Math.round(value)}/100`;
}

export function OverviewAnalytics({
  stats,
  reviews,
  firms,
  logs,
  artifacts,
}: Pick<DashboardData, "stats" | "reviews" | "firms" | "logs" | "artifacts">) {
  const applyRatio = safeRatio(stats.applyCount, stats.totalReviews);
  const skipRatio = safeRatio(stats.skipCount, stats.totalReviews);

  const errorLogs = logs.filter((log) => log.level === "ERROR").length;
  const warnLogs = logs.filter((log) => log.level === "WARN").length;
  const infoLogs = logs.filter((log) => log.level === "INFO").length;

  const sourceCounts = reviews.reduce<Record<string, number>>((acc, review) => {
    acc[review.source] = (acc[review.source] ?? 0) + 1;
    return acc;
  }, {});
  const topSources = Object.entries(sourceCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  const topFirm = firms[0] ?? null;
  const newestArtifact = artifacts[0] ?? null;

  return (
    <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
      <Card>
        <SectionTitle
          eyebrow="Analytics"
          title="Decision mix and operational pulse"
          subtitle="A fast read on how the engine is behaving across reviews, logs, and generated outputs."
        />
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-line bg-panelSoft/80 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.2em] text-muted">Review outcomes</p>
              <Badge tone="neutral">{stats.totalReviews} reviews</Badge>
            </div>
            <div className="mt-4 space-y-4">
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-slate-200">Apply</span>
                  <span className="text-emerald-300">{applyRatio}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                  <div className="h-full rounded-full bg-emerald-400" style={{ width: `${applyRatio}%` }} />
                </div>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-slate-200">Skip</span>
                  <span className="text-rose-300">{skipRatio}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                  <div className="h-full rounded-full bg-rose-400" style={{ width: `${skipRatio}%` }} />
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-panelSoft/80 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.2em] text-muted">System log mix</p>
              <Badge tone="neutral">{stats.totalLogs} logs</Badge>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-line bg-slate-950/30 p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-muted">Info</p>
                <p className="mt-2 text-xl font-semibold text-blue-300">{infoLogs}</p>
              </div>
              <div className="rounded-2xl border border-line bg-slate-950/30 p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-muted">Warn</p>
                <p className="mt-2 text-xl font-semibold text-amber-300">{warnLogs}</p>
              </div>
              <div className="rounded-2xl border border-line bg-slate-950/30 p-3">
                <p className="text-xs uppercase tracking-[0.2em] text-muted">Error</p>
                <p className="mt-2 text-xl font-semibold text-rose-300">{errorLogs}</p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-panelSoft/80 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted">Review sources</p>
            <div className="mt-4 space-y-3">
              {topSources.length > 0 ? (
                topSources.map(([source, count]) => {
                  const width = safeRatio(count, stats.totalReviews || count);
                  return (
                    <div key={source}>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span className="text-slate-200">{source}</span>
                        <span className="text-muted">{count}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-slate-800">
                        <div className="h-full rounded-full bg-blue-400" style={{ width: `${width}%` }} />
                      </div>
                    </div>
                  );
                })
              ) : (
                <p className="text-sm text-muted">No review-source breakdown has been captured yet.</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-panelSoft/80 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted">Key snapshots</p>
            <div className="mt-4 space-y-4 text-sm">
              <div>
                <p className="text-muted">Average score</p>
                <p className="mt-1 text-xl font-semibold text-text">{formatScore(stats.avgScore)}</p>
              </div>
              <div>
                <p className="text-muted">Top tracked company</p>
                <p className="mt-1 text-base font-semibold text-text">
                  {topFirm ? topFirm.name : "No company data yet"}
                </p>
              </div>
              <div>
                <p className="text-muted">Newest artifact</p>
                <p className="mt-1 text-sm text-slate-200">
                  {newestArtifact ? newestArtifact.name : "No artifacts captured yet"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <SectionTitle
          eyebrow="Highlights"
          title="What to look at next"
          subtitle="Quick narrative cues pulled from the current data snapshot."
        />
        <div className="mt-5 space-y-4">
          <div className="rounded-2xl border border-line bg-panelSoft/80 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted">Current state</p>
            <p className="mt-3 text-sm leading-7 text-muted">
              The engine has tracked <span className="font-semibold text-slate-200">{stats.totalJobs}</span> jobs and
              recorded <span className="font-semibold text-slate-200">{stats.totalReviews}</span> review events so far.
              The current apply-to-skip balance is <span className="font-semibold text-emerald-300">{stats.applyCount}</span>
              {" / "}
              <span className="font-semibold text-rose-300">{stats.skipCount}</span>.
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-panelSoft/80 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted">Operational signal</p>
            <p className="mt-3 text-sm leading-7 text-muted">
              {errorLogs > 0
                ? `There are ${errorLogs} recent error-level system logs worth checking in the observability stream.`
                : "No recent error-level logs were captured in the current snapshot."}
            </p>
          </div>

          <div className="rounded-2xl border border-line bg-panelSoft/80 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted">Coverage signal</p>
            <p className="mt-3 text-sm leading-7 text-muted">
              {topFirm
                ? `${topFirm.name} currently has the strongest company-level footprint with ${topFirm.totalReviewedJobs} reviewed jobs captured by the engine.`
                : "Company-level aggregation will show up here once the engine has persisted firm snapshots."}
            </p>
          </div>
        </div>
      </Card>
    </section>
  );
}
