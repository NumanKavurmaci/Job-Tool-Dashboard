import type { DashboardData } from "@/lib/dashboard-data";
import { Badge, Card, SectionTitle } from "@/components/ui";

function parseReasons(value: string): string[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === "string") : [value];
  } catch {
    return [value];
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

          return (
            <article
              key={decision.id}
              className="rounded-2xl border border-line bg-panelSoft/80 p-4"
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0 space-y-3">
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
                        {decision.title ?? "Unknown title"}
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

                  <div className="flex flex-wrap gap-2">
                    <Badge tone={decision.decision === "APPLY" ? "apply" : "skip"}>
                      {decision.decision}
                    </Badge>
                    <Badge tone={decision.policyAllowed ? "info" : "warn"}>
                      {decision.policyAllowed ? "Policy pass" : "Policy blocked"}
                    </Badge>
                    <Badge tone="neutral">Score {decision.score}</Badge>
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted">Reasons</p>
                    <div className="flex flex-wrap gap-2">
                      {reasons.map((reason) => (
                        <Badge key={`${decision.id}-${reason}`} tone="neutral">
                          {reason}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-line bg-slate-950/30 p-3 text-xs text-muted lg:w-72">
                  <p className="uppercase tracking-[0.2em] text-muted">Links</p>
                  <div className="mt-3 space-y-2">
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
