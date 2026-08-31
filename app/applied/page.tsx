import { AppliedSection } from "@/components/dashboard/applied-section";
import { PageIntro } from "@/components/dashboard/page-intro";
import { PageShell } from "@/components/dashboard/page-shell";
import { readAppliedJobs } from "@/lib/engine-db";

export const dynamic = "force-dynamic";

export default function AppliedPage() {
  return (
    <PageShell>
      <PageIntro
        eyebrow="Applied"
        title="AI-approved applications that completed successfully."
        subtitle="This page excludes dry runs, failed or pending attempts, and applications detected as already submitted outside Job Tool."
      />
      <AppliedSection appliedJobs={readAppliedJobs()} />
    </PageShell>
  );
}
