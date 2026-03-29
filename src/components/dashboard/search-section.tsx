import { Badge, Card, SectionTitle } from "@/components/ui";
import type { SearchResultRow } from "@/lib/engine-db";

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

type SearchSectionProps = {
  query: string;
  results: SearchResultRow[];
};

export function SearchSection({ query, results }: SearchSectionProps) {
  const trimmed = query.trim();
  const groups = groupResults(results);

  return (
    <div className="space-y-6">
      <Card>
        <SectionTitle
          eyebrow="Search"
          title="Search across every dashboard collection"
          subtitle="Run one query, then inspect separate result groups for jobs, reviews, decisions, companies, answers, cached answers, and logs."
        />
        <form className="mt-5 flex flex-col gap-3 sm:flex-row" action="/search">
          <input
            type="search"
            name="q"
            defaultValue={query}
            placeholder="Search by title, company, URL, reason, decision id, log text..."
            className="w-full rounded-2xl border border-line bg-panelSoft/80 px-4 py-3 text-sm text-text outline-none transition placeholder:text-slate-500 focus:border-blue-400"
          />
          <button
            type="submit"
            className="rounded-2xl border border-blue-400/30 bg-blue-400/10 px-5 py-3 text-sm font-medium text-blue-300 transition hover:bg-blue-400/20"
          >
            Search
          </button>
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
