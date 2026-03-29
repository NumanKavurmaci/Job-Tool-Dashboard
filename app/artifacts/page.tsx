import { ArtifactsSection } from "@/components/dashboard/artifacts-section";
import { PageIntro } from "@/components/dashboard/page-intro";
import { PageShell } from "@/components/dashboard/page-shell";
import { getDashboardData } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

export default function ArtifactsPage() {
  const data = getDashboardData();

  return (
    <PageShell>
      <PageIntro
        eyebrow="Artifacts"
        title="Generated outputs from the engine."
        subtitle="Browse batch reports, screenshots, and other files the engine emitted while evaluating or applying to jobs."
      />
      <ArtifactsSection artifacts={data.artifacts} />
    </PageShell>
  );
}
