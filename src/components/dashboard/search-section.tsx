import { Badge, Card, SectionTitle } from "@/components/ui";
import {
  SEARCH_COLLECTION_OPTIONS,
  SEARCH_FILTER_OPTIONS,
  SEARCH_SORT_OPTIONS,
  type SearchCollectionOption,
  type SearchFilter,
  type SearchResultRow,
  type SearchSort,
} from "@/lib/engine-db";

const COLLECTION_LABELS: Record<SearchResultRow["collection"], string> = {
  jobs: "Jobs",
  reviews: "Review History",
  decisions: "Decisions",
  companies: "Companies",
  answers: "Prepared Answers",
  "answer-cache": "Answer Cache",
  logs: "System Logs",
};

function groupResults(results: SearchResultRow[]) {
  const groups = new Map<SearchResultRow["collection"], SearchResultRow[]>();
  for (const result of results) {
    const current = groups.get(result.collection) ?? [];
    current.push(result);
    groups.set(result.collection, current);
  }

  return (Object.keys(COLLECTION_LABELS) as Array<SearchResultRow["collection"]>)
    .map((key) => ({
      key,
      label: COLLECTION_LABELS[key],
      results: groups.get(key) ?? [],
    }))
    .filter((group) => group.results.length > 0);
}

function isCollectionChecked(
  value: SearchCollectionOption,
  selectedCollections: SearchCollectionOption[],
): boolean {
  const effective = selectedCollections.length > 0 ? selectedCollections : ["all"];
  return value === "all" ? effective.includes("all") : effective.includes(value);
}

function getBadgeTone(result: SearchResultRow): "apply" | "skip" | "warn" | "info" | "neutral" {
  if (result.level === "ERROR" || result.status === "FAILED" || result.status === "ERROR") {
    return "skip";
  }

  if (result.decision === "APPLY" || result.status === "SUBMITTED") {
    return "apply";
  }

  if (
    result.decision === "SKIP" ||
    result.status?.startsWith("SKIPPED")
  ) {
    return "skip";
  }

  if (
    result.status === "EVALUATED" ||
    result.status === "READY_TO_SUBMIT" ||
    result.status === "VIEWED"
  ) {
    return "warn";
  }

  return "neutral";
}

type SearchSectionProps = {
  query: string;
  results: SearchResultRow[];
  selectedCollections: SearchCollectionOption[];
  selectedFilters: SearchFilter[];
  sort: SearchSort;
};

export function SearchSection({
  query,
  results,
  selectedCollections,
  selectedFilters,
  sort,
}: SearchSectionProps) {
  const trimmed = query.trim();
  const groups = groupResults(results);

  return (
    <div className="space-y-6">
      <Card>
        <SectionTitle
          eyebrow="Search"
          title="Search across dashboard collections"
          subtitle="Use collection selection, text query, filter chips, and sorting together. The dashboard only queries the collections you select."
        />
        <form className="mt-5 space-y-5" action="/search">
          <div className="flex flex-col gap-3 lg:flex-row">
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Search by title, company, URL, reason, decision id, log text..."
              className="w-full rounded-2xl border border-line bg-panelSoft/80 px-4 py-3 text-sm text-text outline-none transition placeholder:text-slate-500 focus:border-blue-400"
            />
            <select
              name="sort"
              defaultValue={sort}
              className="rounded-2xl border border-line bg-panelSoft/80 px-4 py-3 text-sm text-text outline-none transition focus:border-blue-400"
            >
              {SEARCH_SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-2xl border border-blue-400/30 bg-blue-400/10 px-5 py-3 text-sm font-medium text-blue-300 transition hover:bg-blue-400/20"
            >
              Search
            </button>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-info">
                Collections
              </p>
              <div className="flex flex-wrap gap-2">
                {SEARCH_COLLECTION_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className="inline-flex items-center gap-2 rounded-full border border-line bg-panelSoft/70 px-3 py-2 text-sm text-text"
                  >
                    <input
                      type="checkbox"
                      name="collection"
                      value={option.value}
                      defaultChecked={isCollectionChecked(option.value, selectedCollections)}
                      className="h-4 w-4 accent-blue-400"
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-info">
                Filters
              </p>
              <div className="flex flex-wrap gap-2">
                {SEARCH_FILTER_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className="inline-flex items-center gap-2 rounded-full border border-line bg-panelSoft/70 px-3 py-2 text-sm text-text"
                  >
                    <input
                      type="checkbox"
                      name="filter"
                      value={option.value}
                      defaultChecked={selectedFilters.includes(option.value)}
                      className="h-4 w-4 accent-blue-400"
                    />
                    <span>{option.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </form>
      </Card>

      {trimmed.length < 2 ? (
        <Card>
          <div className="rounded-2xl border border-dashed border-line bg-panelSoft/40 p-6 text-sm text-muted">
            Enter at least 2 characters to search the engine collections.
          </div>
        </Card>
      ) : groups.length === 0 ? (
        <Card>
          <div className="rounded-2xl border border-dashed border-line bg-panelSoft/40 p-6 text-sm text-muted">
            No matches were found for <span className="font-semibold text-slate-200">{trimmed}</span>.
          </div>
        </Card>
      ) : (
        groups.map((group) => (
          <Card key={group.key}>
            <SectionTitle
              eyebrow="Collection"
              title={group.label}
              subtitle={`${group.results.length} matching result${group.results.length === 1 ? "" : "s"} in this collection.`}
            />
            <div className="mt-5 space-y-4">
              {group.results.map((result) => (
                <article
                  key={`${group.key}-${result.id}`}
                  className="rounded-2xl border border-line bg-panelSoft/80 p-4"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                    <div className="space-y-2">
                      {result.primaryUrl ? (
                        <a
                          href={result.primaryUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="block text-base font-semibold text-text transition hover:text-blue-300 hover:underline"
                        >
                          {result.title}
                        </a>
                      ) : (
                        <p className="text-base font-semibold text-text">{result.title}</p>
                      )}

                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted">
                        {result.subtitle ? <span>{result.subtitle}</span> : null}
                        {typeof result.score === "number" ? <span>Score {result.score}</span> : null}
                        {result.createdAt ? (
                          <span>{new Date(result.createdAt).toLocaleString()}</span>
                        ) : null}
                      </div>

                      {result.body ? (
                        <p className="max-w-4xl text-sm leading-7 text-muted">{result.body}</p>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Badge tone="neutral">{group.label}</Badge>
                      {result.status ? <Badge tone={getBadgeTone(result)}>{result.status}</Badge> : null}
                      {result.decision ? <Badge tone={getBadgeTone(result)}>{result.decision}</Badge> : null}
                    </div>
                  </div>

                  {result.secondaryUrl ? (
                    <div className="mt-3">
                      <a
                        href={result.secondaryUrl}
                        className="text-xs text-info transition hover:text-blue-300"
                      >
                        {result.secondaryLabel ?? "Open related view"}
                      </a>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </Card>
        ))
      )}
    </div>
  );
}
