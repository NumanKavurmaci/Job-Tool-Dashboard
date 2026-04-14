import { PageIntro } from "@/components/dashboard/page-intro";
import { PageShell } from "@/components/dashboard/page-shell";
import { RecommendationsSection } from "@/components/dashboard/recommendations-section";
import { readRecommendations } from "@/lib/engine-db";

export const dynamic = "force-dynamic";

export default function RecommendationsPage() {
  const recommendations = readRecommendations();

  return (
    <PageShell>
      <PageIntro
        eyebrow="Recommendations"
        title="Explore mode recommendations surfaced from the engine database."
        subtitle="Use this page to review the jobs the AI exploration pipeline judged suitable, without any Easy Apply or external apply execution."
      />
      <RecommendationsSection recommendations={recommendations} />
    </PageShell>
  );
}
