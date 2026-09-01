"use client";

import {
  Building2,
  CalendarDays,
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
import { Badge, Card, SectionTitle } from "@/components/ui";
import { ApplicationTypeBadge } from "@/components/dashboard/application-type-badge";
import { CompanyLogo } from "@/components/dashboard/company-logo";

type RecommendationDetails = {
  scoreThreshold?: number | null;
  aiAdjustment?: number | null;
  aiReasoning?: string | null;
  aiConfidence?: string | null;
  scoringSource?: string | null;
  diagnostics?: {
    applicationType?: string | null;
  } | null;
};

type NormalizedRecommendationJob = {
  remoteType?: string | null;
  seniority?: string | null;
  applicationType?: string | null;
};

type ViewMode = "grid" | "list" | "expanded";
type TimeFilter = "all" | "last-7-days";
type RunFilter = "all" | "latest" | "last-3";

const LAST_SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function parseReasons(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === "string") : [value];
  } catch {
    return [value];
  }
}

function parseJson<T>(value: string | null): T | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function formatRemoteType(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  if (value === "onsite") {
    return "On-site";
  }

  return value.slice(0, 1).toUpperCase() + value.slice(1);
}

function formatSeniority(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  return value.slice(0, 1).toUpperCase() + value.slice(1);
}

function getScoreTone(score: number) {
  if (score >= 60) {
    return "apply" as const;
  }
  if (score >= 45) {
    return "info" as const;
  }
  return "warn" as const;
}

function buildSignals(args: {
  recommendation: DashboardData["recommendations"][number];
  details: RecommendationDetails | null;
  normalized: NormalizedRecommendationJob | null;
}) {
  const { recommendation, details, normalized } = args;

  return [
    recommendation.policyAllowed ? "Policy pass" : "Policy blocked",
    details?.scoringSource ? `Scoring: ${details.scoringSource}` : null,
    details?.aiConfidence ? `AI confidence: ${details.aiConfidence}` : null,
    formatRemoteType(normalized?.remoteType),
    formatSeniority(normalized?.seniority),
    details?.diagnostics?.applicationType ?? null,
    details?.scoreThreshold != null ? `Threshold ${details.scoreThreshold}` : null,
  ].filter((signal): signal is string => Boolean(signal));
}

function getPreviewText(recommendation: DashboardData["recommendations"][number], details: RecommendationDetails | null) {
  const source = details?.aiReasoning ?? recommendation.summary;
  const firstSentence = source.split(/(?<=[.!?])\s+/)[0]?.trim();
  const preview = firstSentence || recommendation.summary;

  if (preview.length <= 150) {
    return preview;
  }

  return `${preview.slice(0, 147).trim()}...`;
}

function getRecentRunIds(recommendations: DashboardData["recommendations"]) {
  const runTimestamps = new Map<string, number>();

  for (const recommendation of recommendations) {
    if (!recommendation.dashboardRunId) {
      continue;
    }

    const timestamp = parseTimestamp(recommendation.updatedAt);
    const previous = runTimestamps.get(recommendation.dashboardRunId) ?? 0;
    runTimestamps.set(
      recommendation.dashboardRunId,
      Number.isFinite(timestamp) ? Math.max(previous, timestamp) : previous,
    );
  }

  return [...runTimestamps.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([runId]) => runId);
}

export function filterRecommendations(args: {
  recommendations: DashboardData["recommendations"];
  timeFilter: TimeFilter;
  runFilter: RunFilter;
  nowMs?: number;
}) {
  const { recommendations, timeFilter, runFilter } = args;
  const nowMs = args.nowMs ?? Date.now();
  const recentRunIds = getRecentRunIds(recommendations);
  const allowedRunIds =
    runFilter === "latest"
      ? new Set(recentRunIds.slice(0, 1))
      : runFilter === "last-3"
        ? new Set(recentRunIds.slice(0, 3))
        : null;

  return recommendations.filter((recommendation) => {
    if (timeFilter === "last-7-days") {
      const timestamp = parseTimestamp(recommendation.updatedAt);
      if (
        !Number.isFinite(timestamp) ||
        timestamp < nowMs - LAST_SEVEN_DAYS_MS ||
        timestamp > nowMs
      ) {
        return false;
      }
    }

    return allowedRunIds
      ? Boolean(
          recommendation.dashboardRunId &&
            allowedRunIds.has(recommendation.dashboardRunId),
        )
      : true;
  });
}

export function RecommendationsSection({
  recommendations,
}: Pick<DashboardData, "recommendations">) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [runFilter, setRunFilter] = useState<RunFilter>("all");
  const recentRunIds = useMemo(() => getRecentRunIds(recommendations), [recommendations]);
  const filteredRecommendations = useMemo(
    () => filterRecommendations({ recommendations, timeFilter, runFilter }),
    [recommendations, runFilter, timeFilter],
  );
  const highestScore =
    filteredRecommendations.length > 0
      ? Math.max(...filteredRecommendations.map((recommendation) => recommendation.score))
      : 0;
  const filtersActive = timeFilter !== "all" || runFilter !== "all";
  const modeOptions = useMemo(
    () =>
      [
        { value: "grid", label: "Grid", icon: LayoutGrid },
        { value: "list", label: "List", icon: Rows3 },
        { value: "expanded", label: "Expanded", icon: ChevronDown },
      ] as const,
    [],
  );

  return (
    <div className="space-y-6">
      <Card className="border-slate-700/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.95),rgba(15,23,42,0.84))]">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <SectionTitle
            eyebrow="Recommendations"
            title="A compact shortlist from explore mode"
            subtitle="Use this page to scan strong matches fast, then open the full job or related decisions only when something looks worth your time."
          />
          <div className="flex flex-wrap gap-3">
            <Badge tone="neutral">
              {filtersActive
                ? `${filteredRecommendations.length} of ${recommendations.length} suggestions`
                : `${recommendations.length} live suggestions`}
            </Badge>
            {filteredRecommendations.length > 0 ? (
              <Badge tone="info">Top score {highestScore}</Badge>
            ) : null}
          </div>
        </div>
      </Card>

      {recommendations.length === 0 ? (
        <Card className="border-dashed border-slate-700/80 bg-panelSoft/40">
          <div className="rounded-[24px] border border-dashed border-line bg-panelSoft/40 p-6 text-sm text-muted">
            No recommended jobs have been recorded yet.
          </div>
        </Card>
      ) : (
        <div className="space-y-5">
          <div className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-wrap items-center gap-3">
              <div
                className="inline-flex rounded-full border border-white/10 bg-slate-950/50 p-1"
                aria-label="Recommendation time range"
              >
                <button
                  type="button"
                  onClick={() => setTimeFilter("all")}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    timeFilter === "all"
                      ? "bg-sky-300/15 text-sky-100 shadow-[inset_0_0_0_1px_rgba(125,211,252,0.22)]"
                      : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-200"
                  }`}
                  aria-pressed={timeFilter === "all"}
                >
                  All dates
                </button>
                <button
                  type="button"
                  onClick={() => setTimeFilter("last-7-days")}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    timeFilter === "last-7-days"
                      ? "bg-sky-300/15 text-sky-100 shadow-[inset_0_0_0_1px_rgba(125,211,252,0.22)]"
                      : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-200"
                  }`}
                  aria-pressed={timeFilter === "last-7-days"}
                >
                  <CalendarDays className="size-3.5" aria-hidden="true" />
                  Last 7 days
                </button>
              </div>

              <label className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/50 px-3 py-1.5 text-xs text-slate-300">
                <TimerReset className="size-3.5 text-sky-200" aria-hidden="true" />
                <span className="font-semibold">Runs</span>
                <select
                  value={runFilter}
                  onChange={(event) => setRunFilter(event.target.value as RunFilter)}
                  disabled={recentRunIds.length === 0}
                  className="bg-transparent font-medium text-slate-100 outline-none disabled:cursor-not-allowed disabled:text-slate-500"
                  aria-label="Filter recommendations by recent runs"
                >
                  <option className="bg-slate-950" value="all">
                    All runs
                  </option>
                  <option className="bg-slate-950" value="latest">
                    Latest run
                  </option>
                  <option className="bg-slate-950" value="last-3">
                    Last 3 runs
                  </option>
                </select>
              </label>

              {filtersActive ? (
                <button
                  type="button"
                  onClick={() => {
                    setTimeFilter("all");
                    setRunFilter("all");
                  }}
                  className="text-xs font-semibold text-slate-400 transition hover:text-sky-200"
                >
                  Clear filters
                </button>
              ) : null}
            </div>

            {recentRunIds.length === 0 ? (
              <p className="text-xs text-slate-500">
                Run filters will be available after the next dashboard-started run.
              </p>
            ) : (
              <p className="text-xs text-slate-500">
                {recentRunIds.length} recent runs available
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-full border border-white/10 bg-white/[0.04] p-1">
              {modeOptions.map((option) => {
                const Icon = option.icon;

                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setViewMode(option.value);
                      if (option.value === "expanded") {
                        setExpandedId(null);
                      }
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      viewMode === option.value
                        ? "bg-sky-300/15 text-sky-100 shadow-[inset_0_0_0_1px_rgba(125,211,252,0.22)]"
                        : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-200"
                    }`}
                    aria-pressed={viewMode === option.value}
                  >
                    <Icon className="size-3.5" aria-hidden="true" />
                    {option.label}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-slate-500">
              Cards start with decision signals; expand when the match deserves a closer read.
            </p>
          </div>

          {filteredRecommendations.length === 0 ? (
            <Card className="border-dashed border-slate-700/80 bg-panelSoft/40">
              <div className="rounded-[24px] border border-dashed border-line bg-panelSoft/40 p-6 text-sm text-muted">
                No recommendations match the selected filters.
              </div>
            </Card>
          ) : (
            <div
              data-view-mode={viewMode}
              className={
                viewMode === "grid"
                  ? "grid gap-5 md:grid-cols-2 xl:grid-cols-3"
                  : "space-y-5"
              }
            >
          {filteredRecommendations.map((recommendation) => {
            const reasons = parseReasons(recommendation.reasons).slice(0, 3);
            const details = parseJson<RecommendationDetails>(recommendation.detailsJson);
            const normalized = parseJson<NormalizedRecommendationJob>(recommendation.normalizedJson);
            const applicationType =
              details?.diagnostics?.applicationType ?? normalized?.applicationType ?? null;
            const signals = buildSignals({
              recommendation,
              details,
              normalized,
            }).slice(0, 4);
            const previewText = getPreviewText(recommendation, details);
            const isExpanded = viewMode === "expanded" || expandedId === recommendation.id;
            const showReasonSummary = viewMode !== "list" && !isExpanded;

            return (
              <Card
                key={recommendation.id}
                className={`h-full border bg-[linear-gradient(180deg,rgba(15,23,42,0.97),rgba(15,23,42,0.86))] px-5 py-5 shadow-[0_20px_45px_rgba(2,6,23,0.18)] transition ${
                  isExpanded ? "border-sky-300/30" : "border-slate-600/80 hover:border-slate-500/90"
                }`}
              >
                <div className="flex h-full flex-col gap-4">
                  <div
                    className={`flex flex-1 flex-col gap-4 ${
                      viewMode === "grid" ? "" : "xl:flex-row xl:items-start xl:justify-between"
                    }`}
                  >
                    <div className="min-w-0 flex-1 space-y-3">
                      <div className="flex items-start gap-3">
                        <CompanyLogo
                          company={recommendation.company}
                          logoUrl={recommendation.companyLogoUrl}
                          linkedinUrl={recommendation.companyLinkedinUrl}
                        />
                        <div className="min-w-0 flex-1 space-y-1">
                          <a
                            href={recommendation.jobUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="block text-lg font-semibold leading-tight text-white transition hover:text-sky-200 hover:underline"
                          >
                            {recommendation.title ?? "Unknown title"}
                          </a>
                          {recommendation.companyLinkedinUrl ? (
                            <a
                              href={recommendation.companyLinkedinUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex text-sm font-medium text-slate-300 hover:text-sky-200"
                            >
                              {recommendation.company ?? "Unknown company"}
                            </a>
                          ) : (
                            <p className="text-sm font-medium text-slate-300">
                              {recommendation.company ?? "Unknown company"}
                            </p>
                          )}
                          {recommendation.location ? (
                            <p className="text-xs text-slate-500">{recommendation.location}</p>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={getScoreTone(recommendation.score)}>
                          Score {recommendation.score}
                        </Badge>
                        <Badge tone={recommendation.policyAllowed ? "apply" : "warn"}>
                          {recommendation.policyAllowed ? "Policy pass" : "Policy blocked"}
                        </Badge>
                        <ApplicationTypeBadge value={applicationType} />
                        {signals.slice(0, 3).map((signal) => (
                          <Badge key={`${recommendation.id}-${signal}`} tone="neutral">
                            {signal}
                          </Badge>
                        ))}
                      </div>

                      <p className="max-w-4xl text-sm leading-6 text-slate-300">
                        {previewText}
                      </p>

                      {showReasonSummary ? (
                        <div className="flex flex-wrap gap-2.5">
                          {reasons.slice(0, 2).map((reason) => (
                            <Badge key={`${recommendation.id}-${reason}`} tone="info">
                              {reason}
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div
                      className={`flex shrink-0 flex-wrap gap-2.5 border-t border-white/10 pt-4 ${
                        viewMode === "grid" ? "mt-auto" : "xl:justify-end xl:border-t-0 xl:pt-0"
                      }`}
                    >
                      <a
                        href={recommendation.jobUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-full border border-sky-300/30 bg-sky-300/10 px-4 py-2 text-sm font-medium text-sky-100 transition hover:border-sky-200/50 hover:bg-sky-300/20"
                      >
                        <ExternalLink className="size-4" aria-hidden="true" />
                        Open job
                      </a>
                      <button
                        type="button"
                        onClick={() => setExpandedId(isExpanded ? null : recommendation.id)}
                        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.1]"
                        aria-expanded={isExpanded}
                      >
                        {isExpanded ? (
                          <ChevronUp className="size-4" aria-hidden="true" />
                        ) : (
                          <ChevronDown className="size-4" aria-hidden="true" />
                        )}
                        Details
                      </button>
                    </div>
                  </div>

                  {isExpanded ? (
                    <div
                      className={`grid gap-4 border-t border-white/10 pt-4 ${
                        viewMode === "grid" ? "" : "lg:grid-cols-[minmax(0,1fr)_auto]"
                      }`}
                    >
                      <div className="min-w-0 space-y-4">
                        <div className="space-y-2">
                          <h3 className="text-sm font-semibold text-slate-100">Match reasoning</h3>
                          <p className="max-w-4xl text-sm leading-6 text-slate-300">
                            {details?.aiReasoning ?? recommendation.summary}
                          </p>
                          {details?.aiAdjustment != null && details.aiAdjustment !== 0 ? (
                            <p className="text-xs leading-5 text-slate-500">
                              Legacy AI adjustment: {details.aiAdjustment}
                            </p>
                          ) : null}
                        </div>

                        <div className="space-y-2">
                          <h3 className="text-sm font-semibold text-slate-100">Signals</h3>
                          <div className="flex flex-wrap gap-2.5">
                            {reasons.map((reason) => (
                              <Badge key={`${recommendation.id}-${reason}`} tone="info">
                                {reason}
                              </Badge>
                            ))}
                            {signals.map((signal) => (
                              <Badge key={`${recommendation.id}-${signal}`} tone="neutral">
                                {signal}
                              </Badge>
                            ))}
                            <Badge tone="neutral">{recommendation.source}</Badge>
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-start gap-2.5 lg:justify-end">
                        <a
                          href={`/decisions?jobUrl=${encodeURIComponent(recommendation.jobUrl)}`}
                          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.1]"
                        >
                          <GitBranch className="size-4" aria-hidden="true" />
                          Related decisions
                        </a>
                        {recommendation.companyLinkedinUrl ? (
                          <a
                            href={recommendation.companyLinkedinUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08]"
                          >
                            <Building2 className="size-4" aria-hidden="true" />
                            Company
                          </a>
                        ) : null}
                      </div>
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
