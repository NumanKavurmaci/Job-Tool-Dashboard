import { FirmsSection } from "@/components/dashboard/firms-section";
import { PageIntro } from "@/components/dashboard/page-intro";
import { PageShell } from "@/components/dashboard/page-shell";
import { readRecentFirms } from "@/lib/engine-db";

export const dynamic = "force-dynamic";

export default function CompaniesPage() {
  const firms = readRecentFirms();

  return (
    <PageShell>
      <PageIntro
        eyebrow="Companies"
        title="Firm-level tracking gathered by the engine."
        subtitle="See which companies have been reviewed, how many job offers were evaluated, how decisions split between apply and skip, and whether the engine captured the company LinkedIn page."
      />
      <FirmsSection firms={firms} />
    </PageShell>
  );
}
