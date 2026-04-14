import type { DashboardData } from "@/lib/dashboard-data";
import { Badge, Card, SectionTitle } from "@/components/ui";

type RecommendationDetails = {
  scoreThreshold?: number | null;
  aiReasoning?: string | null;
  diagnostics?: {
    applicationType?: string | null;
  } | null;
};

type NormalizedRecommendationJob = {
  remoteType?: string | null;
  seniority?: string | null;
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
    formatRemoteType(normalized?.remoteType),
    formatSeniority(normalized?.seniority),
    details?.diagnostics?.applicationType ?? null,
    details?.scoreThreshold != null ? `Threshold ${details.scoreThreshold}` : null,
  ].filter((signal): signal is string => Boolean(signal));
}

export function RecommendationsSection({
  recommendations,
}: Pick<DashboardData, "recommendations">) {
  const highestScore =
    recommendations.length > 0
      ? Math.max(...recommendations.map((recommendation) => recommendation.score))
      : 0;

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
          {recommendations.map((recommendation) => {
            const reasons = parseReasons(recommendation.reasons).slice(0, 3);
            const details = parseJson<RecommendationDetails>(recommendation.detailsJson);
            const normalized = parseJson<NormalizedRecommendationJob>(recommendation.normalizedJson);
            const signals = buildSignals({
              recommendation,
              details,
              normalized,
            }).slice(0, 4);

            return (
              <Card
                key={recommendation.id}
                className="border border-slate-600/90 bg-[linear-gradient(180deg,rgba(15,23,42,0.97),rgba(15,23,42,0.86))] px-5 py-5 shadow-[0_20px_45px_rgba(2,6,23,0.22)]"
              >
                <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 space-y-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={getScoreTone(recommendation.score)}>
                        Score {recommendation.score}
                      </Badge>
                      <Badge tone="neutral">{recommendation.source}</Badge>
                      <Badge tone={recommendation.policyAllowed ? "apply" : "warn"}>
                        {recommendation.policyAllowed ? "Policy pass" : "Policy blocked"}
                      </Badge>
                    </div>

                    <div className="space-y-2">
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
                      {recommendation.summary}
                    </p>

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
                    </div>

                    {details?.aiReasoning ? (
                      <p className="text-xs leading-5 text-slate-400">{details.aiReasoning}</p>
                    ) : null}
                  </div>

                  <div className="flex shrink-0 flex-wrap gap-2.5 border-t border-white/10 pt-4 xl:justify-end xl:border-t-0 xl:pt-0">
                    <a
                      href={recommendation.jobUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center rounded-full border border-sky-300/30 bg-sky-300/10 px-4 py-2 text-sm font-medium text-sky-100 transition hover:border-sky-200/50 hover:bg-sky-300/20"
                    >
                      Open job
                    </a>
                    <a
                      href={`/decisions?jobUrl=${encodeURIComponent(recommendation.jobUrl)}`}
                      className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.1]"
                    >
                      Related decisions
                    </a>
                    {recommendation.companyLinkedinUrl ? (
                      <a
                        href={recommendation.companyLinkedinUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-white/20 hover:bg-white/[0.08]"
                      >
                        Company
                      </a>
                    ) : null}
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
