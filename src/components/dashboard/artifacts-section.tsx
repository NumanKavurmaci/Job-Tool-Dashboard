import type { Route } from "next";
import Link from "next/link";
import type { ArtifactSummary, RunOutcomeJob } from "@/lib/engine-artifacts";
import { Badge, Card, SectionTitle } from "@/components/ui";

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  if (!value) return null;
  return (
    <div className="grid gap-1 sm:grid-cols-[180px_1fr]">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">{label}</p>
      <p className="break-words text-sm text-text">{value}</p>
    </div>
  );
}

function formatDuration(value: number | null | undefined) {
  if (value == null) {
    return null;
  }

  if (value >= 60_000) {
    return `${(value / 60_000).toFixed(1)} min`;
  }

  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)} s`;
  }

  return `${Math.round(value)} ms`;
}

function artifactHref(artifact: ArtifactSummary) {
  return `/artifacts/${artifact.id}` as Route;
}

function statusTone(status: string | null | undefined) {
  if (!status) return "neutral" as const;
  if (status === "completed" || status === "success" || status === "submitted") return "apply" as const;
  if (status === "failed" || status === "error") return "warn" as const;
  return "info" as const;
}

function JobOutcomeList({
  title,
  tone,
  jobs,
  emptyText,
}: {
  title: string;
  tone: "apply" | "skip" | "warn" | "info" | "neutral";
  jobs: RunOutcomeJob[];
  emptyText: string;
}) {
  return (
    <div className="rounded-2xl border border-line bg-panelSoft/80 p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-text">{title}</p>
        <Badge tone={tone}>{jobs.length}</Badge>
      </div>
      {jobs.length === 0 ? (
        <p className="text-sm text-muted">{emptyText}</p>
      ) : (
        <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
          {jobs.map((job) => (
            <a
              key={`${title}-${job.url}`}
              href={job.url}
              target="_blank"
              rel="noreferrer"
              className="block rounded-xl border border-line/70 bg-slate-950/25 p-3 transition hover:border-blue-400/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-text">{job.title ?? "Unknown title"}</p>
                  <p className="mt-1 truncate text-xs text-muted">
                    {job.company ?? "Unknown company"}
                    {job.location ? ` / ${job.location}` : ""}
                  </p>
                </div>
                {job.score != null ? <Badge tone="neutral">{job.score}</Badge> : null}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {job.decision ? <Badge tone={job.decision === "APPLY" ? "apply" : "skip"}>{job.decision}</Badge> : null}
                {job.status ? <Badge tone={statusTone(job.status)}>{job.status}</Badge> : null}
              </div>
              {job.reason ? <p className="mt-2 line-clamp-2 text-xs leading-5 text-muted">{job.reason}</p> : null}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export function ArtifactsSection({ artifacts }: { artifacts: ArtifactSummary[] }) {
  return (
    <Card>
      <SectionTitle
        eyebrow="Artifacts"
        title="Recent runs"
        subtitle="A compact index of generated engine outputs. Open a run for timing, metrics, events, and raw preview details."
      />
      <div className="mt-5 overflow-hidden rounded-2xl border border-line">
        {artifacts.length === 0 ? (
          <div className="bg-panelSoft/40 p-6 text-sm text-muted">
            No generated artifacts have been captured yet.
          </div>
        ) : (
          <div className="divide-y divide-line/70">
            {artifacts.map((artifact) => {
              const duration = formatDuration(artifact.details?.durationMs);
              const summary = artifact.details?.runSummary ?? artifact.name;

              return (
                <Link
                  key={artifact.id}
                  href={artifactHref(artifact)}
                  className="block bg-panelSoft/70 p-4 transition hover:bg-slate-800/70"
                >
                  <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge tone="info">{artifact.category}</Badge>
                        {artifact.details?.mode ? <Badge tone="neutral">{artifact.details.mode}</Badge> : null}
                        {artifact.details?.status ? (
                          <Badge tone={statusTone(artifact.details.status)}>{artifact.details.status}</Badge>
                        ) : null}
                        {duration ? <Badge tone="neutral">{duration}</Badge> : null}
                      </div>
                      <div>
                        <p className="truncate text-base font-semibold text-text">{artifact.name}</p>
                        <p className="mt-1 line-clamp-2 text-sm leading-6 text-muted">{summary}</p>
                      </div>
                    </div>
                    <div className="shrink-0 text-left text-xs text-muted lg:text-right">
                      <p>{new Date(artifact.updatedAt).toLocaleString()}</p>
                      <p className="mt-1">{Math.round(artifact.size / 1024)} KB</p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}

export function ArtifactDetailsSection({ artifact }: { artifact: ArtifactSummary }) {
  const details = artifact.details;
  const duration = formatDuration(details?.durationMs);
  const timingEntries = Object.entries(details?.timings ?? {}).sort(
    ([, left], [, right]) => right.totalMs - left.totalMs,
  );
  const maxTiming = Math.max(...timingEntries.map(([, timing]) => timing.totalMs), 0);
  const outcomeJobs = details?.outcomeJobs ?? {
    recommended: [],
    applied: [],
    incomplete: [],
  };

  return (
    <div className="space-y-6">
      <Card>
        <SectionTitle
          eyebrow="Run"
          title={artifact.name}
          subtitle={details?.runSummary ?? "Generated engine artifact details."}
        />
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-line bg-panelSoft/80 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted">Category</p>
            <p className="mt-2 text-sm font-semibold text-text">{artifact.category}</p>
          </div>
          <div className="rounded-2xl border border-line bg-panelSoft/80 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted">Status</p>
            <p className="mt-2 text-sm font-semibold text-text">{details?.status ?? "n/a"}</p>
          </div>
          <div className="rounded-2xl border border-line bg-panelSoft/80 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted">Duration</p>
            <p className="mt-2 text-sm font-semibold text-text">{duration ?? "n/a"}</p>
          </div>
          <div className="rounded-2xl border border-line bg-panelSoft/80 p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-muted">Updated</p>
            <p className="mt-2 text-sm font-semibold text-text">
              {new Date(artifact.updatedAt).toLocaleString()}
            </p>
          </div>
        </div>
        <div className="mt-5 space-y-3 rounded-2xl border border-line/70 bg-panelSoft/70 p-4">
          <DetailRow label="Path" value={artifact.fullPath} />
          <DetailRow label="Mode" value={details?.mode} />
          <DetailRow label="Stop Reason" value={details?.stopReason} />
          <DetailRow label="Final Stage" value={details?.finalStage} />
        </div>
      </Card>

      <Card>
        <SectionTitle
          eyebrow="Jobs"
          title="Run outcomes"
          subtitle="Recommended jobs, submitted applications, and attempts that stopped before submission."
        />
        <div className="mt-5 grid gap-4 xl:grid-cols-3">
          <JobOutcomeList
            title="Recommended"
            tone="info"
            jobs={outcomeJobs.recommended}
            emptyText="No recommended jobs were recorded for this run."
          />
          <JobOutcomeList
            title="Applied"
            tone="apply"
            jobs={outcomeJobs.applied}
            emptyText="No submitted applications were recorded for this run."
          />
          <JobOutcomeList
            title="Tried but incomplete"
            tone="warn"
            jobs={outcomeJobs.incomplete}
            emptyText="No incomplete application attempts were recorded for this run."
          />
        </div>
      </Card>

      {timingEntries.length > 0 ? (
        <Card>
          <SectionTitle
            eyebrow="Timings"
            title="Slowest run steps"
            subtitle="Sorted by total time so the most expensive work rises to the top."
          />
          <div className="mt-5 space-y-3">
            {timingEntries.map(([key, timing]) => {
              const width = maxTiming > 0 ? Math.max(4, Math.round((timing.totalMs / maxTiming) * 100)) : 0;

              return (
                <div key={key} className="rounded-2xl border border-line bg-panelSoft/80 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <p className="font-mono text-sm font-semibold text-text">{key}</p>
                    <p className="text-sm text-slate-200">{formatDuration(timing.totalMs)} total</p>
                  </div>
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-800">
                    <div className="h-full rounded-full bg-blue-400" style={{ width: `${width}%` }} />
                  </div>
                  <p className="mt-2 text-xs text-muted">
                    {timing.count}x / avg {formatDuration(timing.avgMs)} / max {formatDuration(timing.maxMs)}
                  </p>
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}

      {details ? (
        <Card>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <SectionTitle
              eyebrow="Diagnostics"
              title="Run details"
              subtitle="Compact engine metadata for this run."
            />
          </div>
          <div className="mt-4 space-y-3">
            {details.metrics ? (
              <div className="flex flex-wrap gap-2">
                {Object.entries(details.metrics).map(([key, value]) => (
                  <span
                    key={key}
                    className="rounded-full border border-line bg-panelSoft/80 px-3 py-1.5 text-xs text-muted"
                  >
                    <span className="text-slate-200">{key}</span>: {String(value)}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="grid gap-x-4 gap-y-2 rounded-2xl border border-line/70 bg-panelSoft/70 p-3 md:grid-cols-2">
              <DetailRow label="External URL" value={details.externalApplyUrl} />
              <DetailRow label="External Detected By" value={details.externalDetectedBy?.join(" | ") ?? null} />
              <DetailRow
                label="Precursor Page"
                value={details.precursorPage == null ? null : details.precursorPage ? "Yes" : "No"}
              />
              <DetailRow label="Precursor Signals" value={details.precursorSignals?.join(" | ") ?? null} />
              <DetailRow label="Followed Precursor Link" value={details.followedPrecursorLink} />
              <DetailRow label="Site Feedback" value={details.siteFeedback?.join(" | ") ?? null} />
            </div>

            {details.keyEvents?.length ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">Key Events</p>
                <div className="grid gap-2 md:grid-cols-2">
                  {details.keyEvents.map((event, index) => (
                    <div
                      key={`${artifact.id}-event-${index}`}
                      className="rounded-xl border border-line/70 bg-panelSoft/70 p-2.5 text-xs leading-5 text-text"
                    >
                      {event}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {details.aiCorrectionAttempts?.length ? (
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                  AI Correction Attempts
                </p>
                <div className="space-y-2">
                  {details.aiCorrectionAttempts.map((attempt, index) => (
                    <div
                      key={`${artifact.id}-attempt-${index}`}
                      className="rounded-xl border border-line/70 bg-panelSoft/70 p-3"
                    >
                      <p className="text-sm font-medium text-text">
                        {attempt.fieldLabel} / {attempt.outcome}
                      </p>
                      <p className="mt-1 text-xs text-muted">{attempt.validationFeedback}</p>
                      {attempt.finalFeedback ? (
                        <p className="mt-1 text-xs text-muted">Final: {attempt.finalFeedback}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </Card>
      ) : null}

      {artifact.preview ? (
        <Card>
          <SectionTitle
            eyebrow="Preview"
            title="Raw JSON preview"
            subtitle="First 1200 characters from the artifact file."
          />
          <pre className="mt-5 overflow-x-auto rounded-2xl border border-line/70 bg-slate-950/50 p-4 text-xs text-muted">
            {artifact.preview}
          </pre>
        </Card>
      ) : null}
    </div>
  );
}
