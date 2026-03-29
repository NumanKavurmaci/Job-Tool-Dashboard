import type { DashboardData } from "@/lib/dashboard-data";
import { Badge, Card, SectionTitle } from "@/components/ui";

function parseDecisionIds(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === "string") : [];
  } catch {
    return [];
  }
}

export function FirmsSection({ firms }: Pick<DashboardData, "firms">) {
  return (
    <Card className="overflow-hidden">
      <SectionTitle
        eyebrow="Firms"
        title="Tracked company snapshots"
        subtitle="Company-level review totals, apply/skip counts, and linked decision ids from the engine database."
      />
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        {firms.map((firm) => {
          const decisionIds = parseDecisionIds(firm.decisionIdsJson);

          return (
            <article
              key={firm.id}
              className="rounded-2xl border border-line bg-panelSoft/80 p-4"
            >
              <div className="flex items-start gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-line bg-slate-950/40">
                  {firm.logoUrl ? (
                    <img
                      src={firm.logoUrl}
                      alt={`${firm.name} logo`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-lg font-semibold text-slate-300">
                      {firm.name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-text">{firm.name}</h3>
                      <p className="text-xs text-muted">
                        Updated {new Date(firm.updatedAt).toLocaleString()}
                      </p>
                      {firm.linkedinUrl ? (
                        <a
                          href={firm.linkedinUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="mt-1 inline-flex text-xs text-info hover:text-blue-300"
                        >
                          LinkedIn company page
                        </a>
                      ) : (
                        <p className="mt-1 text-xs text-muted">LinkedIn company page not captured yet.</p>
                      )}
                    </div>
                    <Badge tone="info">{firm.totalReviewedJobs} reviewed</Badge>
                  </div>
                  <div className="flex flex-wrap gap-2 text-xs">
                    <Badge tone="apply">{firm.appliedJobs} apply</Badge>
                    <Badge tone="skip">{firm.skippedJobs} skip</Badge>
                    <Badge tone="neutral">{decisionIds.length} decisions</Badge>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.2em] text-muted">Decision IDs</p>
                    {decisionIds.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {decisionIds.map((decisionId) => (
                          <code
                            key={decisionId}
                            className="rounded-full border border-line bg-slate-950/50 px-2.5 py-1 text-[11px] text-slate-300"
                          >
                            {decisionId}
                          </code>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted">No decisions linked yet.</p>
                    )}
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </Card>
  );
}
