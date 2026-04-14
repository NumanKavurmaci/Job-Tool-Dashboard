import type { DashboardData } from "@/lib/dashboard-data";
import { Badge, Card, SectionTitle } from "@/components/ui";

type RecommendationDetails = {
  scoreThreshold?: number | null;
  aiReasoning?: string | null;
  diagnostics?: {
    applicationType?: string | null;
    remoteType?: string | null;
    companyInfoRead?: boolean | null;
  } | null;
};

type NormalizedRecommendationJob = {
  remoteType?: string | null;
  seniority?: string | null;
  technologies?: string[];
  mustHaveSkills?: string[];
  niceToHaveSkills?: string[];
};

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
    return "Unknown";
  }
  if (value === "onsite") {
    return "On-site";
  }
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}

function formatSeniority(value: string | null | undefined) {
  if (!value) {
    return "Unknown";
  }
  return value.slice(0, 1).toUpperCase() + value.slice(1);
}

function clampScore(score: number) {
  return Math.max(0, Math.min(100, score));
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

function getScoreGradient(score: number) {
  if (score >= 60) {
    return "from-emerald-400 via-teal-300 to-cyan-300";
  }
  if (score >= 45) {
    return "from-sky-400 via-blue-300 to-cyan-200";
  }
  return "from-amber-400 via-orange-300 to-rose-300";
}

function buildTopSignals(args: {
  recommendation: DashboardData["recommendations"][number];
  details: RecommendationDetails | null;
  normalized: NormalizedRecommendationJob | null;
}) {
  const { recommendation, details, normalized } = args;

  return [
    recommendation.policyAllowed ? "Policy pass" : "Policy blocked",
    details?.scoreThreshold != null ? `Threshold ${details.scoreThreshold}` : null,
    normalized?.remoteType ? formatRemoteType(normalized.remoteType) : null,
    normalized?.seniority ? formatSeniority(normalized.seniority) : null,
    details?.diagnostics?.applicationType ?? null,
  ].filter((value): value is string => Boolean(value));
}

function SummaryStat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_18px_50px_rgba(0,0,0,0.25)] backdrop-blur-sm">
      <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-sky-200/80">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-white">{value}</p>
      <p className="mt-2 text-sm leading-6 text-slate-300">{hint}</p>
    </div>
  );
}

export function RecommendationsSection({
  recommendations,
}: Pick<DashboardData, "recommendations">) {
  const highestScore =
    recommendations.length > 0
      ? Math.max(...recommendations.map((recommendation) => recommendation.score))
      : 0;
  const averageScore =
    recommendations.length > 0
      ? Math.round(
          recommendations.reduce((total, recommendation) => total + recommendation.score, 0) /
            recommendations.length,
        )
      : 0;
  const companies = new Set(
    recommendations
      .map((recommendation) => recommendation.company)
      .filter((company): company is string => Boolean(company)),
  ).size;

  return (
    <div className="space-y-6">
      <Card className="overflow-hidden border-slate-700/80 bg-[radial-gradient(circle_at_top_left,_rgba(56,189,248,0.16),_transparent_35%),radial-gradient(circle_at_top_right,_rgba(34,197,94,0.12),_transparent_28%),linear-gradient(180deg,rgba(15,23,42,0.94),rgba(2,6,23,0.96))] p-0">
        <div className="grid gap-6 px-6 py-7 lg:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.95fr)] lg:px-8">
          <div className="space-y-5">
            <SectionTitle
              eyebrow="Recommendations"
              title="Jobs the engine believes deserve a closer look"
              subtitle="This view turns explore-mode output into a shortlist. High-signal jobs float to the top, and each card keeps the score, rationale, and fit context easy to scan."
            />
            <div className="rounded-[28px] border border-white/10 bg-black/20 p-5 text-sm leading-7 text-slate-300">
              Recommendations here are read-only suggestions. They came from the AI extraction, scoring,
              and policy pipeline without entering Easy Apply or external apply flows.
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            <SummaryStat
              label="Recommended Jobs"
              value={String(recommendations.length)}
              hint="Current shortlist size from the latest explore runs."
            />
            <SummaryStat
              label="Highest Score"
              value={String(highestScore)}
              hint="Best-scoring recommendation currently visible."
            />
            <SummaryStat
              label="Company Spread"
              value={String(companies)}
              hint={`Average score ${averageScore} across the current recommendation set.`}
            />
          </div>
        </div>
      </Card>

      {recommendations.length === 0 ? (
        <Card className="border-dashed border-slate-700/80 bg-panelSoft/40">
          <div className="rounded-[28px] border border-dashed border-line bg-panelSoft/40 p-8 text-sm text-muted">
            No recommended jobs have been recorded yet.
          </div>
        </Card>
      ) : (
        <div className="space-y-5">
          {recommendations.map((recommendation, index) => {
            const reasons = parseReasons(recommendation.reasons);
            const details = parseJson<RecommendationDetails>(recommendation.detailsJson);
            const normalized = parseJson<NormalizedRecommendationJob>(
              recommendation.normalizedJson,
            );
            const technologies = normalized?.technologies ?? [];
            const mustHaveSkills = normalized?.mustHaveSkills ?? [];
            const niceToHaveSkills = normalized?.niceToHaveSkills ?? [];
            const topSignals = buildTopSignals({
              recommendation,
              details,
              normalized,
            });
            const scoreTone = getScoreTone(recommendation.score);
            const scoreWidth = `${clampScore(recommendation.score)}%`;

            return (
              <Card
                key={recommendation.id}
                className="overflow-hidden border-slate-700/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.94),rgba(15,23,42,0.76))] p-0 shadow-[0_24px_70px_rgba(2,6,23,0.32)]"
              >
                <div className="grid gap-0 xl:grid-cols-[minmax(280px,340px)_minmax(0,1fr)]">
                  <div className="border-b border-line/70 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.18),_transparent_45%),linear-gradient(180deg,rgba(8,47,73,0.55),rgba(15,23,42,0.85))] p-6 xl:border-b-0 xl:border-r">
                    <div className="flex items-start justify-between gap-4">
                      <Badge tone={scoreTone}>Recommendation #{index + 1}</Badge>
                      <Badge tone="neutral">{recommendation.source}</Badge>
                    </div>

                    <div className="mt-8">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-100/70">
                        Fit Score
                      </p>
                      <div className="mt-3 flex items-end gap-2">
                        <span className="text-6xl font-semibold leading-none text-white">
                          {recommendation.score}
                        </span>
                        <span className="pb-2 text-sm text-slate-300">/ 100</span>
                      </div>
                      <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-900/80">
                        <div
                          className={`h-full rounded-full bg-gradient-to-r ${getScoreGradient(
                            recommendation.score,
                          )}`}
                          style={{ width: scoreWidth }}
                        />
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        <Badge tone={recommendation.policyAllowed ? "apply" : "warn"}>
                          {recommendation.policyAllowed ? "Policy pass" : "Policy blocked"}
                        </Badge>
                        <Badge tone="info">{recommendation.recommendationStatus}</Badge>
                      </div>
                    </div>

                    <div className="mt-8 space-y-3 text-sm text-slate-300">
                      <p className="font-medium text-white">{recommendation.company ?? "Unknown company"}</p>
                      {recommendation.location ? (
                        <p className="leading-6">{recommendation.location}</p>
                      ) : null}
                      <p className="text-slate-400">
                        Updated {new Date(recommendation.updatedAt).toLocaleString()}
                      </p>
                    </div>

                    <div className="mt-8 flex flex-wrap gap-2">
                      <a
                        href={recommendation.jobUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center rounded-full border border-sky-300/30 bg-sky-300/10 px-4 py-2 text-sm font-medium text-sky-100 transition hover:border-sky-200/50 hover:bg-sky-300/20"
                      >
                        Open job
                      </a>
                      {recommendation.companyLinkedinUrl ? (
                        <a
                          href={recommendation.companyLinkedinUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08]"
                        >
                          Company page
                        </a>
                      ) : null}
                    </div>
                  </div>

                  <div className="space-y-5 p-6">
                    <div className="flex items-start gap-4">
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 shadow-[0_12px_30px_rgba(15,23,42,0.35)]">
                        {recommendation.companyLogoUrl ? (
                          <img
                            src={recommendation.companyLogoUrl}
                            alt={`${recommendation.company ?? "Company"} logo`}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-lg font-semibold text-slate-200">
                            {(recommendation.company ?? recommendation.title ?? "?")
                              .slice(0, 1)
                              .toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0 space-y-3">
                        <a
                          href={recommendation.jobUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="block text-xl font-semibold leading-tight text-white transition hover:text-sky-200 hover:underline"
                        >
                          {recommendation.title ?? "Unknown title"}
                        </a>
                        <p className="max-w-3xl text-sm leading-7 text-slate-300">
                          {recommendation.summary}
                        </p>
                      </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(280px,0.9fr)]">
                      <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-100/70">
                          Why it stood out
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {reasons.map((reason) => (
                            <Badge key={`${recommendation.id}-${reason}`} tone="neutral">
                              {reason}
                            </Badge>
                          ))}
                        </div>
                        {details?.aiReasoning ? (
                          <p className="mt-4 text-sm leading-7 text-slate-300">{details.aiReasoning}</p>
                        ) : null}
                      </div>

                      <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-100/70">
                          Fit snapshot
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {topSignals.map((signal) => (
                            <Badge key={`${recommendation.id}-${signal}`} tone="info">
                              {signal}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="grid gap-4 lg:grid-cols-3">
                      <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-100/70">
                          Technologies
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {technologies.length > 0 ? (
                            technologies.slice(0, 8).map((technology) => (
                              <Badge key={`${recommendation.id}-tech-${technology}`} tone="info">
                                {technology}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-sm text-slate-400">No technologies captured.</span>
                          )}
                        </div>
                      </div>

                      <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-100/70">
                          Must-have skills
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {mustHaveSkills.length > 0 ? (
                            mustHaveSkills.slice(0, 6).map((skill) => (
                              <Badge key={`${recommendation.id}-must-${skill}`} tone="warn">
                                {skill}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-sm text-slate-400">No must-have skills captured.</span>
                          )}
                        </div>
                      </div>

                      <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-5">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-sky-100/70">
                          Nice-to-have signals
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {niceToHaveSkills.length > 0 ? (
                            niceToHaveSkills.slice(0, 6).map((skill) => (
                              <Badge key={`${recommendation.id}-nice-${skill}`} tone="neutral">
                                {skill}
                              </Badge>
                            ))
                          ) : (
                            <span className="text-sm text-slate-400">No extra signals captured.</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-3 rounded-[28px] border border-white/10 bg-black/20 px-5 py-4">
                      <p className="text-sm text-slate-300">
                        Read the full history and related review trail for this job before deciding whether to apply.
                      </p>
                      <a
                        href={`/decisions?jobUrl=${encodeURIComponent(recommendation.jobUrl)}`}
                        className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.1]"
                      >
                        View related decisions
                      </a>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
