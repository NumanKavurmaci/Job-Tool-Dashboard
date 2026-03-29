import { DashboardHeader } from "@/components/dashboard/dashboard-header";
import { ReviewsSection } from "@/components/dashboard/reviews-section";
import { SidebarSections } from "@/components/dashboard/sidebar-sections";
import { StatsOverview } from "@/components/dashboard/stats-overview";
import { getDashboardData } from "@/lib/dashboard-data";

export default function HomePage() {
  const data = getDashboardData();

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-6 py-10 lg:px-10">
      <DashboardHeader engineRoot={data.engineRoot} />
      <StatsOverview stats={data.stats} />

      <section className="grid gap-6 xl:grid-cols-[1.4fr_0.8fr]">
        <ReviewsSection reviews={data.reviews} />
        <SidebarSections artifacts={data.artifacts} logs={data.logs} />
      </section>
    </main>
  );
}
