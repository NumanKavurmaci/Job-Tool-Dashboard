import { DecisionsSection } from "@/components/dashboard/decisions-section";
import { PageIntro } from "@/components/dashboard/page-intro";
import { PageShell } from "@/components/dashboard/page-shell";
import { readRecentDecisions } from "@/lib/engine-db";

export const dynamic = "force-dynamic";

type DecisionsPageProps = {
  searchParams?: Promise<{
    decisionId?: string;
    company?: string;
    jobUrl?: string;
  }>;
};

export default async function DecisionsPage({ searchParams }: DecisionsPageProps) {
  const params = (await searchParams) ?? {};
  const decisions = readRecentDecisions({
    ...(params.decisionId ? { decisionId: params.decisionId } : {}),
    ...(params.company ? { company: params.company } : {}),
    ...(params.jobUrl ? { jobUrl: params.jobUrl } : {}),
  });

  const subtitleParts = [
    params.decisionId ? `decision ${params.decisionId}` : null,
    params.company ? `company ${params.company}` : null,
    params.jobUrl ? "selected job posting" : null,
  ].filter(Boolean);

  return (
    <PageShell>
      <PageIntro
        eyebrow="Decisions"
        title="Detailed decision records captured by the engine."
        subtitle={
          subtitleParts.length > 0
            ? `Filtered by ${subtitleParts.join(", ")}.`
            : "Review exact decision ids, scores, policy outcomes, reasons, and the company/job links attached to each decision."
        }
      />
      <DecisionsSection
        decisions={decisions}
        title="Decision detail"
        subtitle="Each row below links the decision id back to its company, job posting, score, and policy outcome."
      />
    </PageShell>
  );
}
