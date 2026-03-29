import type { DashboardData } from "@/lib/dashboard-data";
import { Badge, Card, SectionTitle } from "@/components/ui";

type NormalizedDecisionJob = {
  remoteType?: string | null;
  seniority?: string | null;
  yearsRequired?: number | null;
  applicationType?: string | null;
  technologies?: string[];
  mustHaveSkills?: string[];
  niceToHaveSkills?: string[];
  openQuestionsCount?: number | null;
};

function parseReasons(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === "string") : [value];
  } catch {
    return [value];
  }
}

function parseNormalizedJob(value: string | null): NormalizedDecisionJob | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as NormalizedDecisionJob;
  } catch {
    return null;
  }
}

function buildDecisionHref(filters: { decisionId?: string; company?: string; jobUrl?: string }) {
  const params = new URLSearchParams();
  if (filters.decisionId) {
    params.set("decisionId", filters.decisionId);
  }
  if (filters.company) {
    params.set("company", filters.company);
  }
  if (filters.jobUrl) {
    params.set("jobUrl", filters.jobUrl);
  }
  const query = params.toString();
  return query ? `/decisions?${query}` : "/decisions";
}

function clampScore(score: number) {
  return Math.max(0, Math.min(100, score));
}

function getScoreTone(score: number, threshold: number | null) {
  if (threshold !== null && score >= threshold) {
    return "apply" as const;
  }
  if (score >= 70) {
    return "apply" as const;
  }
  if (score >= 50) {
    return "warn" as const;
  }
  return "skip" as const;
}

function getScoreSummary(score: number, threshold: number | null) {
  if (threshold !== null) {
    return score >= threshold
      ? `Meets the active threshold of ${threshold}.`
      : `Falls below the active threshold of ${threshold}.`;
  }

  if (score >= 70) {
    return "High-confidence fit based on the captured signals.";
  }
  if (score >= 50) {
    return "Borderline fit; review the decision reasons and job signals.";
  }
  return "Low fit based on the captured signals.";
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

function compactSignals(signals: Array<string | null | undefined>) {
  return signals.filter((signal): signal is string => Boolean(signal && signal.trim()));
}

export function DecisionsSection({
  decisions,
  title = "Recent decisions",
  subtitle = "Detailed application decisions captured from the engine database.",
}: Pick<DashboardData, "decisions"> & { title?: string; subtitle?: string }) {
  return (
    <Card className="overflow-hidden">
      <SectionTitle eyebrow="Decisions" title={title} subtitle={subtitle} />
      <div className="mt-5 space-y-4">
        {decisions.map((decision) => {
          const reasons = parseReasons(decision.reasons);
          const normalized = parseNormalizedJob(decision.normalizedJson);
          const scoreTone = getScoreTone(decision.score, decision.threshold);
          const scoreWidth = `${clampScore(decision.score)}%`;
          const keySignals = compactSignals([
            normalized?.remoteType ? `Workplace: ${formatRemoteType(normalized.remoteType)}` : null,
            normalized?.seniority ? `Seniority: ${formatSeniority(normalized.seniority)}` : null,
            typeof normalized?.yearsRequired === "number"
              ? `Experience: ${normalized.yearsRequired}+ years`
              : null,
            normalized?.applicationType ? `Apply flow: ${normalized.applicationType}` : null,
            typeof normalized?.openQuestionsCount === "number"
              ? `Open questions: ${normalized.openQuestionsCount}`
              : null,
          ]);

          const technologies = normalized?.technologies ?? [];
          const mustHaveSkills = normalized?.mustHaveSkills ?? [];
          const niceToHaveSkills = normalized?.niceToHaveSkills ?? [];

          return (
            <article
              key={decision.id}
              className="rounded-2xl border border-line bg-panelSoft/80 p-4"
            >
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0 flex-1 space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-line bg-slate-950/40">
                      {decision.companyLogoUrl ? (
                        <img
                          src={decision.companyLogoUrl}
                          alt={`${decision.company ?? "Company"} logo`}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="text-sm font-semibold text-slate-300">
                          {(decision.company ?? decision.title ?? "?").slice(0, 1).toUpperCase()}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-base font-semibold text-text">
                        <a
                          href={decision.jobUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="transition hover:text-blue-300 hover:underline"
                        >
                          {decision.title ?? "Unknown title"}
                        </a>
                      </p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
                        <span>{decision.company ?? "Unknown company"}</span>
                        {decision.location ? <span>• {decision.location}</span> : null}
                        <span>• {new Date(decision.createdAt).toLocaleString()}</span>
                      </div>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <a
                          href={decision.jobUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-info hover:text-blue-300"
                        >
                          Open job posting
                        </a>
                        {decision.companyLinkedinUrl ? (
                          <a
                            href={decision.companyLinkedinUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-info hover:text-blue-300"
                          >
                            Open company page
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
                    <div className="rounded-2xl border border-line bg-slate-950/30 p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-muted">Score</p>
                          <div className="mt-2 flex items-end gap-2">
                            <span className="text-3xl font-semibold text-text">{decision.score}</span>
                            <span className="pb-1 text-sm text-muted">/ 100</span>
                          </div>
                        </div>
                        <div className="text-right text-xs text-muted">
                          <p>{getScoreSummary(decision.score, decision.threshold)}</p>
                          <p className="mt-1">
                            {decision.threshold !== null
                              ? `Threshold ${decision.threshold}`
                              : "No threshold captured"}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-800">
                        <div
                          className={
                            scoreTone === "apply"
                              ? "h-full rounded-full bg-emerald-400"
                              : scoreTone === "warn"
                                ? "h-full rounded-full bg-amber-400"
                                : "h-full rounded-full bg-rose-400"
                          }
                          style={{ width: scoreWidth }}
                        />
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge tone={decision.decision === "APPLY" ? "apply" : "skip"}>
                          {decision.decision}
                        </Badge>
                        <Badge tone={decision.policyAllowed ? "info" : "warn"}>
                          {decision.policyAllowed ? "Policy pass" : "Policy blocked"}
                        </Badge>
                        {decision.threshold !== null ? (
                          <Badge tone="neutral">Threshold {decision.threshold}</Badge>
                        ) : null}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-line bg-slate-950/30 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted">Decision context</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {keySignals.length > 0 ? (
                          keySignals.map((signal) => (
                            <Badge key={`${decision.id}-${signal}`} tone="neutral">
                              {signal}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted">
                            Normalized job signals were not captured for this decision.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-3">
                    <div className="rounded-2xl border border-line bg-slate-950/30 p-4 lg:col-span-2">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted">Why this decision happened</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {reasons.map((reason) => (
                          <Badge key={`${decision.id}-${reason}`} tone="neutral">
                            {reason}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-line bg-slate-950/30 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted">Links</p>
                      <div className="mt-3 space-y-2 text-xs">
                        <a
                          href={buildDecisionHref({ decisionId: decision.id })}
                          className="block text-info hover:text-blue-300"
                        >
                          Filter by this decision ID
                        </a>
                        {decision.company ? (
                          <a
                            href={buildDecisionHref({ company: decision.company })}
                            className="block text-info hover:text-blue-300"
                          >
                            Show all decisions for {decision.company}
                          </a>
                        ) : null}
                        <a
                          href={buildDecisionHref({ jobUrl: decision.jobUrl })}
                          className="block text-info hover:text-blue-300"
                        >
                          Show decisions for this job
                        </a>
                        <p className="font-mono text-[11px] text-slate-400">{decision.id}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-3 lg:grid-cols-3">
                    <div className="rounded-2xl border border-line bg-slate-950/30 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted">Technologies</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {technologies.length > 0 ? (
                          technologies.map((technology) => (
                            <Badge key={`${decision.id}-tech-${technology}`} tone="info">
                              {technology}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted">No technologies captured.</span>
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-line bg-slate-950/30 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted">Must-have skills</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {mustHaveSkills.length > 0 ? (
                          mustHaveSkills.map((skill) => (
                            <Badge key={`${decision.id}-must-${skill}`} tone="warn">
                              {skill}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted">No must-have skills captured.</span>
                        )}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-line bg-slate-950/30 p-4">
                      <p className="text-xs uppercase tracking-[0.2em] text-muted">Nice-to-have skills</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {niceToHaveSkills.length > 0 ? (
                          niceToHaveSkills.map((skill) => (
                            <Badge key={`${decision.id}-nice-${skill}`} tone="neutral">
                              {skill}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-sm text-muted">No nice-to-have skills captured.</span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          );
        })}

        {decisions.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-panelSoft/40 p-6 text-sm text-muted">
            No decisions matched the selected filters yet.
          </div>
        ) : null}
      </div>
    </Card>
  );
}
