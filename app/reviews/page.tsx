import { PageIntro } from "@/components/dashboard/page-intro";
import { PageShell } from "@/components/dashboard/page-shell";
import { ReviewsSection } from "@/components/dashboard/reviews-section";
import { getDashboardData } from "@/lib/dashboard-data";

export const dynamic = "force-dynamic";

export default function ReviewsPage() {
  const data = getDashboardData();

  return (
    <PageShell>
      <PageIntro
        eyebrow="Review History"
        title="Decision history across reviewed job offers."
        subtitle="Inspect the latest evaluations, scores, thresholds, and the reasons the engine recorded for apply or skip outcomes."
      />
      <ReviewsSection reviews={data.reviews} />
    </PageShell>
  );
}
