import type { DashboardData } from "@/lib/dashboard-data";
import { Badge, Card, SectionTitle } from "@/components/ui";

type HighlightGroup = {
  eyebrow: string;
  title: string;
  subtitle: string;
  rows: DashboardData["topApplications"];
  empty: string;
  tone: "apply" | "skip" | "warn";
};

function HighlightCard({ group }: { group: HighlightGroup }) {
  return (
    <Card className="overflow-hidden">
      <SectionTitle eyebrow={group.eyebrow} title={group.title} subtitle={group.subtitle} />
      <div className="mt-5 space-y-4">
        {group.rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-line bg-panelSoft/40 p-6 text-sm text-muted">
            {group.empty}
          </div>
        ) : (
          group.rows.map((row) => (
            <article
              key={row.id}
              className="rounded-2xl border border-line bg-panelSoft/80 p-4"
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <a
                    href={row.jobUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="block text-base font-semibold text-text transition hover:text-blue-300 hover:underline"
                  >
                    {row.title ?? "Unknown title"}
                  </a>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
                    <span>{row.company ?? "Unknown company"}</span>
                    {row.location ? <span>· {row.location}</span> : null}
                    <span>· {new Date(row.createdAt).toLocaleString()}</span>
                  </div>
                  {row.summary ? (
                    <p className="max-w-4xl text-sm leading-7 text-muted">{row.summary}</p>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-2">
                  {typeof row.score === "number" ? (
                    <Badge tone="neutral">Score {row.score}</Badge>
                  ) : null}
                  <Badge tone={group.tone}>{row.status}</Badge>
                  {row.decision ? <Badge tone={group.tone}>{row.decision}</Badge> : null}
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </Card>
  );
}

export function HomeHighlightsSection({
  topApplications,
  incompleteApplications,
  topMissedHighScoreJobs,
  topPendingApprovedJobs,
}: Pick<
  DashboardData,
  | "topApplications"
  | "incompleteApplications"
  | "topMissedHighScoreJobs"
  | "topPendingApprovedJobs"
>) {
  const groups: HighlightGroup[] = [
    {
      eyebrow: "Top Applications",
      title: "Highest-scoring completed applications",
      subtitle: "The strongest submitted applications captured by the engine so far.",
      rows: topApplications,
      empty: "No submitted applications have been recorded yet.",
      tone: "apply",
    },
    {
      eyebrow: "Incomplete Applications",
      title: "Approved jobs that still need attention",
      subtitle: "Every latest job record that started or qualified for apply but did not end in a submitted application.",
      rows: incompleteApplications,
      empty: "No incomplete approved applications are currently visible.",
      tone: "warn",
    },
    {
      eyebrow: "Top Missed",
      title: "High-scoring jobs that still failed",
      subtitle: "Approved jobs with strong scores whose flows still ended in failure.",
      rows: topMissedHighScoreJobs,
      empty: "No failed high-scoring approved jobs are currently visible.",
      tone: "skip",
    },
    {
      eyebrow: "Top Pending",
      title: "Highest-scoring approved jobs still pending",
      subtitle: "Approved jobs that were evaluated strongly but have not been fully submitted yet.",
      rows: topPendingApprovedJobs,
      empty: "No pending approved jobs are currently visible.",
      tone: "warn",
    },
  ];

  return (
    <section className="grid gap-4 xl:grid-cols-2">
      {groups.map((group) => (
        <HighlightCard key={group.title} group={group} />
      ))}
    </section>
  );
}
