import { Activity, Archive, Database, ShieldCheck } from "lucide-react";
import type { DashboardData } from "@/lib/dashboard-data";
import { Card } from "@/components/ui";

function formatScore(value: number | null) {
  return value == null ? "n/a" : `${Math.round(value)}`;
}

export function StatsOverview({ stats }: Pick<DashboardData, "stats">) {
  return (
    <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Card>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted">Tracked Jobs</p>
            <p className="mt-3 text-3xl font-semibold">{stats.totalJobs}</p>
          </div>
          <Database className="text-info" />
        </div>
      </Card>
      <Card>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted">Review Events</p>
            <p className="mt-3 text-3xl font-semibold">{stats.totalReviews}</p>
          </div>
          <ShieldCheck className="text-emerald-300" />
        </div>
      </Card>
      <Card>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted">System Logs</p>
            <p className="mt-3 text-3xl font-semibold">{stats.totalLogs}</p>
          </div>
          <Activity className="text-amber-300" />
        </div>
      </Card>
      <Card>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted">Average Review Score</p>
            <p className="mt-3 text-3xl font-semibold">{formatScore(stats.avgScore)}</p>
            <p className="mt-2 text-xs text-muted">
              Apply: {stats.applyCount} / Skip: {stats.skipCount}
            </p>
          </div>
          <Archive className="text-slate-300" />
        </div>
      </Card>
    </section>
  );
}
