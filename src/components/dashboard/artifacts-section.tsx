import type { DashboardData } from "@/lib/dashboard-data";
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
      <p className="text-sm text-text">{value}</p>
    </div>
  );
}

function formatMs(value: number) {
  return `${Math.round(value)} ms`;
}

export function ArtifactsSection({ artifacts }: Pick<DashboardData, "artifacts">) {
  return (
    <Card>
      <SectionTitle
        eyebrow="Artifacts"
        title="Recent generated files"
        subtitle="Batch reports, apply runs, and screenshots emitted by the engine with run-level diagnostics."
      />
      <div className="mt-5 space-y-4">
        {artifacts.map((artifact) => (
          <div
            key={artifact.fullPath}
            className="rounded-2xl border border-line bg-panelSoft/80 p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="truncate text-sm font-medium text-text">{artifact.name}</p>
              <div className="flex flex-wrap gap-2">
                <Badge tone="info">{artifact.category}</Badge>
                {artifact.details?.mode ? <Badge tone="neutral">{artifact.details.mode}</Badge> : null}
                {artifact.details?.status ? <Badge tone="warn">{artifact.details.status}</Badge> : null}
                {artifact.details?.durationMs != null ? (
                  <Badge tone="neutral">{`${artifact.details.durationMs} ms`}</Badge>
                ) : null}
              </div>
            </div>

            <p className="mt-2 break-all text-xs text-muted">{artifact.fullPath}</p>

            {artifact.details ? (
              <div className="mt-4 space-y-3 rounded-2xl border border-line/70 bg-panel/60 p-4">
                <DetailRow label="Run Summary" value={artifact.details.runSummary} />
                <DetailRow label="Stop Reason" value={artifact.details.stopReason} />
                <DetailRow label="Final Stage" value={artifact.details.finalStage} />
                <DetailRow label="External URL" value={artifact.details.externalApplyUrl} />
                <DetailRow
                  label="External Detected By"
                  value={artifact.details.externalDetectedBy?.join(" | ") ?? null}
                />
                <DetailRow
                  label="Precursor Page"
                  value={
                    artifact.details.precursorPage == null
                      ? null
                      : artifact.details.precursorPage
                        ? "Yes"
                        : "No"
                  }
                />
                <DetailRow
                  label="Precursor Signals"
                  value={artifact.details.precursorSignals?.join(" | ") ?? null}
                />
                <DetailRow
                  label="Followed Precursor Link"
                  value={artifact.details.followedPrecursorLink}
                />
                <DetailRow
                  label="Site Feedback"
                  value={artifact.details.siteFeedback?.join(" | ") ?? null}
                />

                {artifact.details.keyEvents?.length ? (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                      Key Events
                    </p>
                    <div className="space-y-2">
                      {artifact.details.keyEvents.map((event, index) => (
                        <div
                          key={`${artifact.fullPath}-event-${index}`}
                          className="rounded-xl border border-line/70 bg-panelSoft/70 p-3 text-sm text-text"
                        >
                          {event}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {artifact.details.metrics ? (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                      Metrics
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {Object.entries(artifact.details.metrics).map(([key, value]) => (
                        <div
                          key={`${artifact.fullPath}-metric-${key}`}
                          className="rounded-xl border border-line/70 bg-panelSoft/70 p-3"
                        >
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                            {key}
                          </p>
                          <p className="mt-1 text-sm text-text">{String(value)}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                {artifact.details.timings ? (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                      Timings
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {Object.entries(artifact.details.timings)
                        .sort(([, left], [, right]) => right.totalMs - left.totalMs)
                        .map(([key, timing]) => (
                          <div
                            key={`${artifact.fullPath}-timing-${key}`}
                            className="rounded-xl border border-line/70 bg-panelSoft/70 p-3"
                          >
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                              {key}
                            </p>
                            <p className="mt-1 text-sm text-text">{formatMs(timing.totalMs)} total</p>
                            <p className="mt-1 text-xs text-muted">
                              {timing.count}x / avg {formatMs(timing.avgMs)} / max {formatMs(timing.maxMs)}
                            </p>
                          </div>
                        ))}
                    </div>
                  </div>
                ) : null}

                {artifact.details.aiCorrectionAttempts?.length ? (
                  <div className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                      AI Correction Attempts
                    </p>
                    <div className="space-y-2">
                      {artifact.details.aiCorrectionAttempts.map((attempt, index) => (
                        <div
                          key={`${artifact.fullPath}-attempt-${index}`}
                          className="rounded-xl border border-line/70 bg-panelSoft/70 p-3"
                        >
                          <p className="text-sm font-medium text-text">
                            {attempt.fieldLabel} · {attempt.outcome}
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
            ) : artifact.preview ? (
              <pre className="mt-4 overflow-x-auto rounded-2xl border border-line/70 bg-panel/60 p-4 text-xs text-muted">
                {artifact.preview}
              </pre>
            ) : null}
          </div>
        ))}
      </div>
    </Card>
  );
}
