"use client";

import { ChevronDown, ChevronUp, ExternalLink, GitBranch, RotateCcw, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { Badge, Card, SectionTitle } from "@/components/ui";
import type {
  SearchCollectionOption,
  SearchFilter,
  SearchResultRow,
  SearchSort,
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

const SEARCH_COLLECTION_OPTIONS: Array<{
  value: SearchCollectionOption;
  label: string;
}> = [
  { value: "all", label: "All" },
  { value: "jobs", label: "Jobs" },
  { value: "reviews", label: "Review History" },
  { value: "decisions", label: "Decisions" },
  { value: "companies", label: "Companies" },
  { value: "answers", label: "Prepared Answers" },
  { value: "answer-cache", label: "Answer Cache" },
  { value: "logs", label: "System Logs" },
];

const SEARCH_FILTER_OPTIONS: Array<{
  value: SearchFilter;
  label: string;
}> = [
  { value: "applied", label: "Applied" },
  { value: "incomplete", label: "Incomplete apply" },
  { value: "skipped", label: "Skipped" },
  { value: "error", label: "Error" },
  { value: "pending", label: "Pending" },
];

const SEARCH_SORT_OPTIONS: Array<{
  value: SearchSort;
  label: string;
}> = [
  { value: "newest", label: "Newest" },
  { value: "oldest", label: "Oldest" },
  { value: "top-score", label: "Top score" },
  { value: "company-az", label: "Company A-Z" },
];

type ViewMode = "compact" | "comfortable" | "expanded";

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

  if (result.status === "SUBMITTED") {
    return "apply";
  }

  if (result.decision === "APPLY" && result.status && result.status !== "SUBMITTED") {
    return "warn";
  }

  if (result.decision === "APPLY") {
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

function formatDate(value: string | null) {
  if (!value) {
    return null;
  }

  return new Date(value).toLocaleString();
}

function getPreviewText(value: string | null) {
  if (!value) {
    return null;
  }

  const normalized = value.replace(/\s+/g, " ").trim();
  if (normalized.length <= 170) {
    return normalized;
  }

  return `${normalized.slice(0, 167).trim()}...`;
}

function formatBody(result: SearchResultRow) {
  if (!result.body) {
    return null;
  }

  if (result.collection !== "answers") {
    return result.body;
  }

  try {
    const parsed = JSON.parse(result.body) as unknown;
    return JSON.stringify(parsed, null, 2);
  } catch {
    return result.body;
  }
}

function getDetailRows(result: SearchResultRow, collectionLabel: string) {
  return [
    ["Collection", collectionLabel],
    ["Result ID", result.id],
    ["Score", typeof result.score === "number" ? String(result.score) : null],
    ["Decision", result.decision ?? null],
    ["Status", result.status ?? null],
    ["Level", result.level ?? null],
    ["Created", formatDate(result.createdAt)],
    ["Primary URL", result.primaryUrl],
  ].filter((row): row is [string, string] => Boolean(row[1]));
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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>("compact");
  const groups = groupResults(results);
  const isBrowseMode = query.trim().length === 0;
  const isShortQuery = query.trim().length === 1;
  const resultCount = results.length;
  const modeOptions = useMemo(
    () =>
      [
        { value: "compact", label: "Compact" },
        { value: "comfortable", label: "Comfortable" },
        { value: "expanded", label: "Expanded" },
      ] satisfies Array<{ value: ViewMode; label: string }>,
    [],
  );

  return (
    <div className="space-y-6">
      <Card>
        <SectionTitle
          eyebrow="Search"
          title={isBrowseMode ? "Browse dashboard collections" : "Search across dashboard collections"}
          subtitle="Use collection selection, optional text query, filter chips, and sorting together. Empty query works as browse mode."
        />
        <form className="mt-5 space-y-5" action="/search">
          <div className="flex flex-col gap-3 lg:flex-row">
            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-500" aria-hidden="true" />
              <input
                type="search"
                name="q"
                defaultValue={query}
                placeholder="Search by title, company, URL, reason, decision id, log text..."
                className="w-full rounded-2xl border border-line bg-panelSoft/80 py-3 pl-11 pr-4 text-sm text-text outline-none transition placeholder:text-slate-500 focus:border-blue-400"
              />
            </div>
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
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-400/30 bg-blue-400/10 px-5 py-3 text-sm font-medium text-blue-300 transition hover:bg-blue-400/20"
            >
              <Search className="size-4" aria-hidden="true" />
              Search
            </button>
            <a
              href="/search?q="
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3 text-sm font-medium text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08]"
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              Browse
            </a>
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

      {groups.length === 0 ? (
        <Card>
          <div className="rounded-2xl border border-dashed border-line bg-panelSoft/40 p-6 text-sm text-muted">
            {isShortQuery ? (
              "Enter at least 2 characters to search, or clear the query to browse recent rows."
            ) : query.trim().length > 0 ? (
              <>
                No matches were found for <span className="font-semibold text-slate-200">{query.trim()}</span>.
              </>
            ) : (
              "No rows matched the current collection, filter, and sort combination."
            )}
          </div>
        </Card>
      ) : (
        <div className="space-y-5">
          <Card className="border-slate-700/80 bg-panelSoft/50 py-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  <Badge tone="info">{resultCount} result{resultCount === 1 ? "" : "s"}</Badge>
                  {groups.map((group) => (
                    <Badge key={group.key} tone="neutral">
                      {group.label} {group.results.length}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-slate-500">
                  {isBrowseMode ? "Browse mode is showing recent or highest-signal rows without a text query." : "Results are grouped by collection and start in compact scan mode."}
                </p>
              </div>

              <div className="inline-flex self-start rounded-full border border-white/10 bg-white/[0.04] p-1 lg:self-auto">
                {modeOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setViewMode(option.value);
                      if (option.value === "expanded") {
                        setExpandedId(null);
                      }
                    }}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                      viewMode === option.value
                        ? "bg-sky-300/15 text-sky-100 shadow-[inset_0_0_0_1px_rgba(125,211,252,0.22)]"
                        : "text-slate-400 hover:bg-white/[0.05] hover:text-slate-200"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </Card>

          {groups.map((group) => (
            <Card key={group.key}>
              <SectionTitle
                eyebrow="Collection"
                title={group.label}
                subtitle={`${group.results.length} matching result${group.results.length === 1 ? "" : "s"} in this collection.`}
              />
              <div className="mt-5 space-y-3">
                {group.results.map((result) => {
                  const cardId = `${group.key}-${result.id}`;
                  const isExpanded = viewMode === "expanded" || expandedId === cardId;
                  const showComfortableBody = viewMode === "comfortable" && !isExpanded;
                  const bodyPreview = getPreviewText(result.body);
                  const detailBody = formatBody(result);
                  const detailRows = getDetailRows(result, group.label);

                  return (
                    <article
                      key={cardId}
                      className={`rounded-2xl border bg-panelSoft/80 p-4 transition ${
                        isExpanded ? "border-sky-300/30" : "border-line hover:border-slate-600"
                      }`}
                    >
                      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                        <div className="min-w-0 space-y-2">
                          <div className="flex flex-wrap gap-2">
                            <Badge tone="neutral">{group.label}</Badge>
                            {typeof result.score === "number" ? <Badge tone="info">Score {result.score}</Badge> : null}
                            {result.status ? <Badge tone={getBadgeTone(result)}>{result.status}</Badge> : null}
                            {result.decision ? <Badge tone={getBadgeTone(result)}>{result.decision}</Badge> : null}
                          </div>

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
                            {formatDate(result.createdAt) ? <span>{formatDate(result.createdAt)}</span> : null}
                          </div>

                          {bodyPreview ? (
                            <p className={`max-w-4xl text-sm leading-6 text-muted ${showComfortableBody ? "" : "line-clamp-1"}`}>
                              {bodyPreview}
                            </p>
                          ) : null}
                        </div>

                        <div className="flex shrink-0 flex-wrap gap-2">
                          {result.primaryUrl ? (
                            <a
                              href={result.primaryUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-2 rounded-full border border-sky-300/30 bg-sky-300/10 px-4 py-2 text-sm font-medium text-sky-100 transition hover:border-sky-200/50 hover:bg-sky-300/20"
                            >
                              <ExternalLink className="size-4" aria-hidden="true" />
                              Open
                            </a>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => setExpandedId(isExpanded ? null : cardId)}
                            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.1]"
                            aria-expanded={isExpanded}
                          >
                            {isExpanded ? (
                              <ChevronUp className="size-4" aria-hidden="true" />
                            ) : (
                              <ChevronDown className="size-4" aria-hidden="true" />
                            )}
                            Details
                          </button>
                        </div>
                      </div>

                      {isExpanded ? (
                        <div className="mt-4 grid gap-4 border-t border-white/10 pt-4 lg:grid-cols-[minmax(0,1fr)_auto]">
                          <div className="min-w-0 space-y-4">
                            {detailBody ? (
                              <div className="space-y-2">
                                <h3 className="text-sm font-semibold text-slate-100">Details</h3>
                                <pre className="whitespace-pre-wrap break-words rounded-2xl border border-white/10 bg-slate-950/30 p-3 text-sm leading-6 text-slate-300">
                                  {detailBody}
                                </pre>
                              </div>
                            ) : null}

                            <div className="grid gap-2 sm:grid-cols-2">
                              {detailRows.map(([label, value]) => (
                                <div key={`${cardId}-${label}`} className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
                                  <p className="mt-1 break-words text-sm text-slate-300">{value}</p>
                                </div>
                              ))}
                            </div>
                          </div>

                          {result.secondaryUrl ? (
                            <div className="flex flex-wrap items-start gap-2 lg:justify-end">
                              <a
                                href={result.secondaryUrl}
                                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-sm font-medium text-white transition hover:border-white/20 hover:bg-white/[0.1]"
                              >
                                <GitBranch className="size-4" aria-hidden="true" />
                                {result.secondaryLabel ?? "Open related view"}
                              </a>
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </article>
                  );
                })}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
