import type { DashboardData } from "@/lib/dashboard-data";
import { Badge, Card, SectionTitle } from "@/components/ui";

function buildDecisionHref(filters: { company?: string; jobUrl?: string }) {
  const params = new URLSearchParams();
  if (filters.company) {
    params.set("company", filters.company);
  }
  if (filters.jobUrl) {
    params.set("jobUrl", filters.jobUrl);
  }

  const query = params.toString();
  return query ? `/decisions?${query}` : "/decisions";
}

export function ReviewsSection({ reviews }: Pick<DashboardData, "reviews">) {
  return (
    <Card className="overflow-hidden">
      <SectionTitle
        eyebrow="Review History"
        title="Recent reviewed jobs"
        subtitle="Latest decisions, scores, and reasons from the engine database."
      />
      <div className="mt-5 overflow-x-auto">
        <table className="min-w-full divide-y divide-line text-sm">
          <thead className="text-left text-xs uppercase tracking-[0.18em] text-muted">
            <tr>
              <th className="pb-3 pr-4">Job</th>
              <th className="pb-3 pr-4">Decision</th>
              <th className="pb-3 pr-4">Score</th>
              <th className="pb-3 pr-4">Source</th>
              <th className="pb-3">Reason</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line/70">
            {reviews.map((review) => (
              <tr key={review.id} className="align-top">
                <td className="py-4 pr-4">
                  <div className="space-y-1">
                    <a
                      href={review.jobUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="block font-medium text-text transition hover:text-blue-300 hover:underline"
                    >
                      {review.title ?? "Unknown title"}
                    </a>
                    {review.companyLinkedinUrl ? (
                      <a
                        href={review.companyLinkedinUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex text-muted hover:text-blue-300"
                      >
                        {review.company ?? "Unknown company"}
                      </a>
                    ) : (
                      <p className="text-muted">
                        {review.company ?? "Unknown company"}
                      </p>
                    )}
                    <a
                      href={buildDecisionHref({
                        ...(review.company ? { company: review.company } : {}),
                        jobUrl: review.jobUrl,
                      })}
                      className="block text-xs text-info hover:text-blue-300"
                    >
                      View related decisions
                    </a>
                  </div>
                </td>
                <td className="py-4 pr-4">
                  <Badge tone={review.decision === "APPLY" ? "apply" : "skip"}>
                    {review.decision ?? review.status}
                  </Badge>
                </td>
                <td className="py-4 pr-4 text-slate-200">
                  {review.score ?? "n/a"}
                  {review.threshold != null ? (
                    <span className="block text-xs text-muted">
                      threshold {review.threshold}
                    </span>
                  ) : null}
                </td>
                <td className="py-4 pr-4 text-muted">{review.source}</td>
                <td className="py-4 text-muted">
                  {review.summary ?? review.reasons}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
