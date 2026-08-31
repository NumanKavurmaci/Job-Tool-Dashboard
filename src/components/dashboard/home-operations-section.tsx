import Link from "next/link";
import { AlertTriangle, ArrowRight, CheckCircle2, PlayCircle } from "lucide-react";
import type { EngineStatusCheck } from "@/lib/engine-status";
import type { EngineRunRecord } from "@/lib/engine-runner";
import type { RunProgressSummary } from "@/lib/run-progress";
import { Badge, Card, SectionTitle } from "@/components/ui";

type HomeRun = EngineRunRecord & { progress: RunProgressSummary | null };

function runTone(status: HomeRun["status"] | undefined) {
  if (status === "completed") return "apply" as const;
  if (status === "failed") return "skip" as const;
  if (status === "stopped") return "warn" as const;
  if (status === "running") return "info" as const;
  if (status === "stopping") return "warn" as const;
  return "neutral" as const;
}

export function HomeOperationsSection({
  runs,
  incompleteCount,
  runBlockers,
}: {
  runs: HomeRun[];
  incompleteCount: number;
  runBlockers: EngineStatusCheck[];
}) {
  const activeRuns = runs.filter((run) => run.status === "running" || run.status === "stopping");
  const currentRun = activeRuns[0] ?? runs[0] ?? null;
  const activity = currentRun?.progress?.currentActivity;

  return (
    <section className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
      <Card className="border-blue-400/20 bg-[linear-gradient(180deg,rgba(15,23,42,0.97),rgba(15,23,42,0.86))]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <SectionTitle
            eyebrow="Operations"
            title={activeRuns.length > 0 ? `${activeRuns.length}/2 engine runs active` : "Run control"}
            subtitle={
              activity?.label ??
              (currentRun
                ? `Latest dashboard run finished ${currentRun.status}.`
                : "Start with a dry run, monitor progress, and keep the live path explicit.")
            }
          />
          <Badge tone={activeRuns.length === 2 ? "warn" : runTone(currentRun?.status)}>
            {activeRuns.length}/2 active
          </Badge>
        </div>

        {activeRuns.length > 0 ? (
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {activeRuns.map((run) => (
              <div key={run.id} className="rounded-2xl border border-line bg-black/20 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-text">{run.mode}</p>
                  <Badge tone={runTone(run.status)}>{run.status}</Badge>
                </div>
                <p className="mt-2 truncate text-xs text-muted">
                  {run.progress?.currentActivity?.label ?? run.id.slice(0, 8)}
                </p>
              </div>
            ))}
          </div>
        ) : null}

        <Link
          href="/run"
          className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-400"
        >
          <PlayCircle className="size-4" aria-hidden="true" />
          {activeRuns.length > 0 ? "Open live controls" : "Configure a run"}
        </Link>
      </Card>

      <Card>
        <div className="flex items-start justify-between gap-4">
          <SectionTitle
            eyebrow="Needs attention"
            title="Resolve blockers before applying"
            subtitle="Readiness failures and incomplete applications are the next actionable work."
          />
          <Badge tone={runBlockers.length > 0 || incompleteCount > 0 ? "warn" : "apply"}>
            {runBlockers.length + incompleteCount}
          </Badge>
        </div>

        <div className="mt-5 space-y-3">
          {runBlockers.slice(0, 3).map((check) => (
            <div key={check.key} className="flex items-start gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-3">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-300" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-text">{check.label}</p>
                <p className="mt-1 break-all text-xs text-muted">{check.detail}</p>
              </div>
            </div>
          ))}

          {runBlockers.length === 0 ? (
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-3">
              <CheckCircle2 className="size-4 text-emerald-300" aria-hidden="true" />
              <p className="text-sm text-emerald-100">Primary apply-batch prerequisites are ready.</p>
            </div>
          ) : null}

          <Link
            href="/search?filter=incomplete&collection=reviews"
            className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-black/20 p-3 text-sm text-text transition hover:border-slate-500"
          >
            <span>{incompleteCount} incomplete application{incompleteCount === 1 ? "" : "s"}</span>
            <ArrowRight className="size-4 text-info" aria-hidden="true" />
          </Link>
        </div>
      </Card>
    </section>
  );
}
