import { PageIntro } from "@/components/dashboard/page-intro";
import { PageShell } from "@/components/dashboard/page-shell";
import { SearchSection } from "@/components/dashboard/search-section";
import {
  searchCollections,
  type SearchCollectionOption,
  type SearchFilter,
  type SearchSort,
} from "@/lib/engine-db";

export const dynamic = "force-dynamic";

type SearchPageProps = {
  searchParams?: Promise<{
    q?: string;
    collection?: string | string[];
    filter?: string | string[];
    sort?: string;
  }>;
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const params = (await searchParams) ?? {};
  const query = params.q ?? "";
  const collections = Array.isArray(params.collection)
    ? params.collection
    : params.collection
      ? [params.collection]
      : ["all"];
  const filters = Array.isArray(params.filter)
    ? params.filter
    : params.filter
      ? [params.filter]
      : [];
  const sort = (params.sort ?? "newest") as SearchSort;
  const results = searchCollections({
    query,
    collections: collections as SearchCollectionOption[],
    filters: filters as SearchFilter[],
    sort,
  });

  return (
    <PageShell>
      <PageIntro
        eyebrow="Search"
        title="Search every collection the dashboard knows about."
        subtitle="Combine collection selection, text query, filters, and sorting across the read-only engine database."
      />
      <SearchSection
        query={query}
        results={results}
        selectedCollections={collections as SearchCollectionOption[]}
        selectedFilters={filters as SearchFilter[]}
        sort={sort}
      />
    </PageShell>
  );
}
