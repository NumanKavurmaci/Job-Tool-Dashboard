import { FirmsSection } from "@/components/dashboard/firms-section";
import { PageIntro } from "@/components/dashboard/page-intro";
import { PageShell } from "@/components/dashboard/page-shell";
import { getDashboardData } from "@/lib/dashboard-data";

export default function CompaniesPage() {
  const data = getDashboardData();

  return (
    <PageShell>
      <PageIntro
        eyebrow="Companies"
        title="Firm-level tracking gathered by the engine."
        subtitle="See which companies have been reviewed, how many job offers were evaluated, and how many decisions ended in apply or skip."
      />
      <FirmsSection firms={data.firms} />
    </PageShell>
  );
}
