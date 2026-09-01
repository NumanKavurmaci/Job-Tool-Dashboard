"use client";

import {
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  GitBranch,
  LayoutGrid,
  Rows3,
  TimerReset,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { DashboardData } from "@/lib/dashboard-data";
import { parseTimestamp } from "@/lib/date-time";
import { ApplicationTypeBadge, normalizeApplicationType } from "@/components/dashboard/application-type-badge";
import { CompanyLogo } from "@/components/dashboard/company-logo";
import { Badge, Card, SectionTitle } from "@/components/ui";

type ViewMode = "grid" | "list" | "expanded";
type TimeFilter = "all" | "last-7-days";
type RunFilter = "all" | "latest" | "last-3";

type AppliedDetails = {
  applicationType?: string | null;
  diagnostics?: { applicationType?: string | null } | null;
  easyApplyStatus?: string | null;
  externalFinalStage?: string | null;
  externalApplication?: { finalStage?: string | null } | null;
};

type NormalizedJob = { applicationType?: string | null };
const LAST_SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function parseJson<T>(value: string | null): T | null {
  if (!value) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function parseReasons(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((entry): entry is string => typeof entry === "string")
      : [value];
  } catch {
    return [value];
  }
}

function getApplicationType(job: DashboardData["appliedJobs"][number]) {
  const details = parseJson<AppliedDetails>(job.detailsJson);
  const normalized = parseJson<NormalizedJob>(job.normalizedJson);
  const explicit = normalizeApplicationType(
    details?.applicationType ?? details?.diagnostics?.applicationType ?? normalized?.applicationType,
  );
  if (explicit) return explicit;
  if (details?.externalFinalStage || details?.externalApplication) return "external" as const;
  if (details?.easyApplyStatus) return "easy_apply" as const;
  return job.platform && job.platform !== "linkedin" ? ("external" as const) : null;
}

function getRecentRunIds(jobs: DashboardData["appliedJobs"]) {
  const timestamps = new Map<string, number>();
  for (const job of jobs) {
    if (!job.dashboardRunId) continue;
    const timestamp = parseTimestamp(job.createdAt);
    timestamps.set(job.dashboardRunId, Math.max(timestamps.get(job.dashboardRunId) ?? 0, timestamp || 0));
  }
  return [...timestamps.entries()].sort((left, right) => right[1] - left[1]).map(([runId]) => runId);
}

export function filterAppliedJobs(args: {
  jobs: DashboardData["appliedJobs"];
  timeFilter: TimeFilter;
  runFilter: RunFilter;
  nowMs?: number;
}) {
  const nowMs = args.nowMs ?? Date.now();
  const runIds = getRecentRunIds(args.jobs);
  const allowedRuns =
    args.runFilter === "latest"
      ? new Set(runIds.slice(0, 1))
      : args.runFilter === "last-3"
        ? new Set(runIds.slice(0, 3))
        : null;

  return args.jobs.filter((job) => {
    if (args.timeFilter === "last-7-days") {
      const timestamp = parseTimestamp(job.createdAt);
      if (!Number.isFinite(timestamp) || timestamp < nowMs - LAST_SEVEN_DAYS_MS || timestamp > nowMs) {
        return false;
      }
    }
    return allowedRuns ? Boolean(job.dashboardRunId && allowedRuns.has(job.dashboardRunId)) : true;
  });
}

export function AppliedSection({ appliedJobs }: Pick<DashboardData, "appliedJobs">) {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [runFilter, setRunFilter] = useState<RunFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const recentRunIds = useMemo(() => getRecentRunIds(appliedJobs), [appliedJobs]);
  const filteredJobs = useMemo(
    () => filterAppliedJobs({ jobs: appliedJobs, timeFilter, runFilter }),
    [appliedJobs, runFilter, timeFilter],
  );
  const filtersActive = timeFilter !== "all" || runFilter !== "all";
  const modeOptions = [
    { value: "grid", label: "Grid", icon: LayoutGrid },
    { value: "list", label: "List", icon: Rows3 },
    { value: "expanded", label: "Expanded", icon: ChevronDown },
  ] as const;

  return (
    <div className="space-y-6">
      <Card className="border-emerald-400/20 bg-[linear-gradient(180deg,rgba(6,78,59,0.16),rgba(15,23,42,0.9))]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <SectionTitle
            eyebrow="Applied"
            title="Successfully completed applications"
            subtitle="Only AI-approved jobs whose application flow started and finished with a submitted result appear here."
          />
          <div className="flex flex-wrap gap-3">
            <Badge tone="apply">
              {filtersActive ? `${filteredJobs.length} of ${appliedJobs.length} submitted` : `${appliedJobs.length} submitted`}
            </Badge>
            <Badge tone="neutral">AI approved</Badge>
          </div>
        </div>
      </Card>

      {appliedJobs.length === 0 ? (
        <Card className="border-dashed border-slate-700/80 bg-panelSoft/40">
          <p className="rounded-[24px] border border-dashed border-line p-6 text-sm text-muted">
            No successfully submitted applications have been recorded yet.
          </p>
        </Card>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex rounded-full border border-white/10 bg-slate-950/50 p-1" aria-label="Applied job time range">
                {(["all", "last-7-days"] as const).map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setTimeFilter(value)}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      timeFilter === value
                        ? "bg-emerald-300/15 text-emerald-100 shadow-[inset_0_0_0_1px_rgba(110,231,183,0.22)]"
                        : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-200"
                    }`}
                    aria-pressed={timeFilter === value}
                  >
                    {value === "last-7-days" ? <CalendarDays className="size-3.5" aria-hidden="true" /> : null}
                    {value === "all" ? "All dates" : "Last 7 days"}
                  </button>
                ))}
              </div>
              <label className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/50 px-3 py-1.5 text-xs text-slate-300">
                <TimerReset className="size-3.5 text-emerald-200" aria-hidden="true" />
                <span className="font-semibold">Runs</span>
                <select
                  value={runFilter}
                  onChange={(event) => setRunFilter(event.target.value as RunFilter)}
                  disabled={recentRunIds.length === 0}
                  className="bg-transparent font-medium text-slate-100 outline-none disabled:text-slate-500"
                  aria-label="Filter applied jobs by recent runs"
                >
                  <option className="bg-slate-950" value="all">All runs</option>
                  <option className="bg-slate-950" value="latest">Latest run</option>
                  <option className="bg-slate-950" value="last-3">Last 3 runs</option>
                </select>
              </label>
              {filtersActive ? (
                <button
                  type="button"
                  onClick={() => { setTimeFilter("all"); setRunFilter("all"); }}
                  className="text-xs font-semibold text-slate-400 hover:text-emerald-200"
                >
                  Clear filters
                </button>
              ) : null}
            </div>
            <p className="text-xs text-slate-500">
              {recentRunIds.length > 0 ? `${recentRunIds.length} recent runs available` : "Run filters will be available after a dashboard-started run."}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-full border border-white/10 bg-white/[0.04] p-1">
              {modeOptions.map((option) => {
                const Icon = option.icon;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => { setViewMode(option.value); if (option.value === "expanded") setExpandedId(null); }}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      viewMode === option.value ? "bg-emerald-300/15 text-emerald-100" : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-200"
                    }`}
                    aria-pressed={viewMode === option.value}
                  >
                    <Icon className="size-3.5" aria-hidden="true" />{option.label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-slate-500">Completed applications only; detected pre-existing applications are excluded.</p>
          </div>

          {filteredJobs.length === 0 ? (
            <Card className="border-dashed border-slate-700/80 bg-panelSoft/40">
              <p className="p-5 text-sm text-muted">No submitted applications match the selected filters.</p>
            </Card>
          ) : (
            <div data-view-mode={viewMode} className={viewMode === "grid" ? "grid gap-5 md:grid-cols-2 xl:grid-cols-3" : "space-y-5"}>
              {filteredJobs.map((job) => {
                const isExpanded = viewMode === "expanded" || expandedId === job.id;
                const applicationType = getApplicationType(job);
                const reasons = parseReasons(job.reasons).slice(0, 3);
                return (
                  <Card key={job.id} className={`h-full border px-5 py-5 ${isExpanded ? "border-emerald-300/30" : "border-slate-600/80"}`}>
                    <div className="flex h-full flex-col gap-4">
                      <div className="flex items-start gap-3">
                        <CompanyLogo company={job.company} logoUrl={job.companyLogoUrl} linkedinUrl={job.companyLinkedinUrl} />
                        <div className="min-w-0 flex-1 space-y-1">
                          <a href={job.jobUrl} target="_blank" rel="noreferrer" className="block text-lg font-semibold leading-tight text-white hover:text-emerald-200 hover:underline">
                            {job.title ?? "Unknown title"}
                          </a>
                          <p className="text-sm font-medium text-slate-300">{job.company ?? "Unknown company"}</p>
                          {job.location ? <p className="text-xs text-slate-500">{job.location}</p> : null}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <Badge tone="apply"><CheckCircle2 className="mr-1 size-3.5" aria-hidden="true" />Submitted</Badge>
                        <Badge tone="info">Score {job.score ?? "n/a"}</Badge>
                        <ApplicationTypeBadge value={applicationType} />
                      </div>
                      <p className="text-sm leading-6 text-slate-300">{job.summary ?? reasons[0] ?? "Application completed successfully."}</p>
                      <div className="mt-auto flex flex-wrap gap-2.5 border-t border-white/10 pt-4">
                        <a href={job.jobUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-300/10 px-4 py-2 text-sm font-medium text-emerald-100 hover:bg-emerald-300/20">
                          <ExternalLink className="size-4" aria-hidden="true" />Open job
                        </a>
                        <button type="button" onClick={() => setExpandedId(isExpanded ? null : job.id)} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-medium text-white" aria-expanded={isExpanded}>
                          {isExpanded ? <ChevronUp className="size-4" aria-hidden="true" /> : <ChevronDown className="size-4" aria-hidden="true" />}Details
                        </button>
                      </div>
                      {isExpanded ? (
                        <div className="space-y-3 border-t border-white/10 pt-4 text-sm text-slate-300">
                          <p><span className="font-semibold text-slate-100">Submitted:</span> {new Date(parseTimestamp(job.createdAt)).toLocaleString()}</p>
                          <p><span className="font-semibold text-slate-100">Source:</span> {job.source}</p>
                          <div className="flex flex-wrap gap-2">{reasons.map((reason) => <Badge key={reason} tone="neutral">{reason}</Badge>)}</div>
                          <a href={`/decisions?jobUrl=${encodeURIComponent(job.jobUrl)}`} className="inline-flex items-center gap-2 text-sm text-sky-200 hover:text-sky-100">
                            <GitBranch className="size-4" aria-hidden="true" />Related decisions
                          </a>
                        </div>
                      ) : null}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
