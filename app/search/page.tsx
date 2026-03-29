import { PageIntro } from "@/components/dashboard/page-intro";
import { PageShell } from "@/components/dashboard/page-shell";
import { SearchSection } from "@/components/dashboard/search-section";
import { searchCollections } from "@/lib/engine-db";

export const dynamic = "force-dynamic";

type SearchPageProps = {
  searchParams?: Promise<{
    q?: string;
  }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = (await searchParams) ?? {};
  const query = params.q ?? "";
  const results = searchCollections(query);

  return (
    <PageShell>
      <PageIntro
        eyebrow="Search"
        title="Search every collection the dashboard knows about."
        subtitle="Query the read-only engine database across jobs, review history, decisions, companies, prepared answers, cached answers, and system logs."
      />
      <SearchSection query={query} results={results} />
    </PageShell>
  );
}
