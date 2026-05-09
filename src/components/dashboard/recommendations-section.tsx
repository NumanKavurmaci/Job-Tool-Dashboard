"use client";

import { Building2, ChevronDown, ChevronUp, ExternalLink, GitBranch } from "lucide-react";
import { useMemo, useState } from "react";
import type { DashboardData } from "@/lib/dashboard-data";
import { Badge, Card, SectionTitle } from "@/components/ui";

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
};

type ViewMode = "compact" | "comfortable" | "expanded";

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

export function RecommendationsSection({
  recommendations,
}: Pick<DashboardData, "recommendations">) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("compact");
  const highestScore =
    recommendations.length > 0
      ? Math.max(...recommendations.map((recommendation) => recommendation.score))
      : 0;
  const modeOptions = useMemo(
    () =>
      [
        { value: "compact", label: "Compact" },
        { value: "comfortable", label: "Comfortable" },
        { value: "expanded", label: "Expanded" },
      ] satisfies Array<{ value: ViewMode; label: string }>,
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
            <Badge tone="neutral">{recommendations.length} live suggestions</Badge>
            <Badge tone="info">Top score {highestScore}</Badge>
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="inline-flex rounded-full border border-white/10 bg-white/[0.04] p-1">
              {modeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setViewMode(option.value);
                    if (option.value === "expanded") {
                      setExpandedId(null);
                    }
                  }}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    viewMode === option.value
                      ? "bg-sky-300/15 text-sky-100 shadow-[inset_0_0_0_1px_rgba(125,211,252,0.22)]"
                      : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-200"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-slate-500">
              Cards start with decision signals; expand when the match deserves a closer read.
            </p>
          </div>

          {recommendations.map((recommendation) => {
            const reasons = parseReasons(recommendation.reasons).slice(0, 3);
            const details = parseJson<RecommendationDetails>(recommendation.detailsJson);
            const normalized = parseJson<NormalizedRecommendationJob>(recommendation.normalizedJson);
            const signals = buildSignals({
              recommendation,
              details,
              normalized,
            }).slice(0, 4);
            const previewText = getPreviewText(recommendation, details);
            const isExpanded = viewMode === "expanded" || expandedId === recommendation.id;
            const showComfortableSummary = viewMode === "comfortable" && !isExpanded;

            return (
              <Card
                key={recommendation.id}
                className={`border bg-[linear-gradient(180deg,rgba(15,23,42,0.97),rgba(15,23,42,0.86))] px-5 py-4 shadow-[0_20px_45px_rgba(2,6,23,0.18)] transition ${
                  isExpanded ? "border-sky-300/30" : "border-slate-600/80 hover:border-slate-500/90"
                }`}
              >
                <div className="flex flex-col gap-4">
                  <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                    <div className="min-w-0 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone={getScoreTone(recommendation.score)}>
                          Score {recommendation.score}
                        </Badge>
                        <Badge tone={recommendation.policyAllowed ? "apply" : "warn"}>
                          {recommendation.policyAllowed ? "Policy pass" : "Policy blocked"}
                        </Badge>
                        {signals.slice(0, 3).map((signal) => (
                          <Badge key={`${recommendation.id}-${signal}`} tone="neutral">
                            {signal}
                          </Badge>
                        ))}
                      </div>

                      <div className="space-y-1">
                        <a
                          href={recommendation.jobUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="block text-lg font-semibold leading-tight text-white transition hover:text-sky-200 hover:underline"
                        >
                          {recommendation.title ?? "Unknown title"}
                        </a>
                        <p className="text-sm text-slate-300">
                          {recommendation.company ?? "Unknown company"}
                          {recommendation.location ? ` · ${recommendation.location}` : ""}
                        </p>
                      </div>

                      <p className="max-w-4xl text-sm leading-6 text-slate-300">
                        {previewText}
                      </p>

                      {showComfortableSummary ? (
                        <div className="flex flex-wrap gap-2.5">
                          {reasons.slice(0, 2).map((reason) => (
                            <Badge key={`${recommendation.id}-${reason}`} tone="info">
                              {reason}
                            </Badge>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex shrink-0 flex-wrap gap-2.5 border-t border-white/10 pt-4 xl:justify-end xl:border-t-0 xl:pt-0">
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
                    <div className="grid gap-4 border-t border-white/10 pt-4 lg:grid-cols-[minmax(0,1fr)_auto]">
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
  );
}
