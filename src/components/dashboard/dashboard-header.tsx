import type { DashboardData } from "@/lib/dashboard-data";

export function DashboardHeader({ engineRoot }: Pick<DashboardData, "engineRoot">) {
  return (
    <header className="space-y-4">
      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-info">
        Job Tool Dashboard
      </p>
      <div className="space-y-3">
        <h1 className="max-w-4xl text-4xl font-semibold tracking-tight text-text lg:text-5xl">
          Dark, read-only visibility into everything the engine has already accomplished.
        </h1>
        <p className="max-w-3xl text-base leading-7 text-muted">
          This dashboard reads the existing Job Tool database, logs, and artifacts without
          mutating them. It is designed as an external, presentation-focused view over the engine
          workspace.
        </p>
        <p className="text-sm text-muted">
          Engine root: <span className="font-mono text-slate-300">{engineRoot}</span>
        </p>
      </div>
    </header>
  );
}
