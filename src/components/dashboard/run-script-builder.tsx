"use client";

import { AlertTriangle, CheckCircle2, CircleStop, Copy, Play, RefreshCw, Terminal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge, Card, SectionTitle } from "@/components/ui";
import {
  RUN_SCRIPT_DEFINITIONS,
  buildRunArgs,
  buildGeneratedRunScript,
  getRunScriptDefinition,
  isApplyRunType,
  type RunFieldDefinition,
  type RunFormValues,
  type RunScriptType,
} from "@/lib/run-config";
import { getBlockingRunChecks } from "@/lib/run-readiness";

type ConfigStatus = {
  ready: boolean;
  llmProvider: "openai" | "local" | null;
  localLlmBaseUrl: string | null;
  checks: Array<{
    key: string;
    label: string;
    ok: boolean;
    detail: string;
  }>;
};

type RunProgressReview = {
  createdAt: string;
  jobUrl: string;
  status: string;
  score: number | null;
  threshold: number | null;
  decision: string | null;
  policyAllowed: number | null;
  summary: string | null;
  title: string | null;
  company: string | null;
  location: string | null;
};

type CurrentRun = {
  id: string;
  args: string[];
  mode: string;
  command: string;
  cwd: string;
  startedAt: string;
  finishedAt: string | null;
  executionMode: "dry-run" | "live" | "non-submit";
  correlationMode: "run-id" | "legacy-time";
  exclusiveResources: string[];
  status: "running" | "stopping" | "completed" | "failed" | "stopped";
  revision: number;
  exitCode: number | null;
  pid: number | null;
  events: Array<{
    id: string;
    type: string;
    message: string;
    createdAt: string;
  }>;
  progress: {
    evaluatedCount: number;
    skippedCount: number;
    submittedCount: number;
    failedCount: number;
    applyDecisionCount: number;
    terminalOutcome: {
      status: "success" | "partial" | "failed";
      reason: string | null;
    } | null;
    currentActivity: {
      stage: "starting" | "scanning" | "evaluating" | "applying" | "submitted" | "partial" | "failed" | "completed" | "stopping" | "stopped";
      label: string;
      detail: string | null;
      jobUrl: string | null;
      title: string | null;
      company: string | null;
      location: string | null;
      score: number | null;
      decision: string | null;
      updatedAt: string;
    } | null;
    latestArtifact: {
      name: string;
      fullPath: string;
      updatedAt: string;
      size: number;
    } | null;
    reviews: RunProgressReview[];
  } | null;
};

type RunDisplayStatus = CurrentRun["status"] | "partial";
type RunActivityStage = NonNullable<NonNullable<CurrentRun["progress"]>["currentActivity"]>["stage"];

function statusTone(status: RunDisplayStatus | undefined) {
  if (status === "running") return "info" as const;
  if (status === "stopping" || status === "partial") return "warn" as const;
  if (status === "completed") return "apply" as const;
  if (status === "failed") return "skip" as const;
  if (status === "stopped") return "warn" as const;
  return "neutral" as const;
}

function displayStatus(run: CurrentRun | null | undefined): RunDisplayStatus | undefined {
  if (run?.status === "completed" && run.progress?.terminalOutcome?.status === "partial") {
    return "partial";
  }
  if (run?.status === "completed" && run.progress?.terminalOutcome?.status === "failed") {
    return "failed";
  }
  return run?.status;
}

function activityTone(stage: RunActivityStage) {
  if (stage === "partial" || stage === "stopping" || stage === "stopped") return "warn" as const;
  if (stage === "failed") return "skip" as const;
  if (stage === "completed" || stage === "submitted") return "apply" as const;
  return "info" as const;
}

function outcomeTone(review: RunProgressReview) {
  if (review.status === "SUBMITTED") return "apply" as const;
  if (review.status === "FAILED") return "skip" as const;
  if (review.status.startsWith("SKIPPED")) return "warn" as const;
  if (review.decision === "APPLY") return "info" as const;
  return "neutral" as const;
}

function executionTone(mode: CurrentRun["executionMode"]) {
  if (mode === "live") return "skip" as const;
  if (mode === "dry-run") return "info" as const;
  return "neutral" as const;
}

function isLiveApplyRun(type: RunScriptType, values: RunFormValues) {
  return isApplyRunType(type) && values.dryRun === false;
}

function buildInitialValues(scriptType: RunScriptType): RunFormValues {
  const definition = getRunScriptDefinition(scriptType);
  return Object.fromEntries(definition.fields.map((field) => [field.key, field.defaultValue]));
}

function FieldInput({
  field,
  value,
  onChange,
}: {
  field: RunFieldDefinition;
  value: string | number | boolean | undefined;
  onChange: (nextValue: string | number | boolean) => void;
}) {
  if (field.type === "checkbox") {
    return (
      <label className="flex items-start gap-3 rounded-2xl border border-line bg-black/20 p-4">
        <input
          checked={value === true}
          className="mt-1 h-4 w-4 accent-blue-400"
          type="checkbox"
          onChange={(event) => onChange(event.target.checked)}
        />
        <div className="space-y-1">
          <p className="text-sm font-medium text-text">{field.label}</p>
          {field.description ? <p className="text-xs text-muted">{field.description}</p> : null}
        </div>
      </label>
    );
  }

  if (field.type === "select") {
    return (
      <label className="space-y-2">
        <span className="text-sm font-medium text-text">{field.label}</span>
        <select
          className="w-full rounded-2xl border border-line bg-slate-950/80 px-4 py-3 text-sm text-text outline-none transition focus:border-blue-400"
          value={String(value ?? field.defaultValue ?? "")}
          onChange={(event) => onChange(event.target.value)}
        >
          {(field.options ?? []).map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {field.description ? <p className="text-xs text-muted">{field.description}</p> : null}
      </label>
    );
  }

  const inputValue = field.type === "number"
    ? typeof value === "number" || typeof value === "string"
      ? value
      : typeof field.defaultValue === "number"
        ? field.defaultValue
        : ""
    : String(value ?? "");

  return (
    <label className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-text">{field.label}</span>
        {field.required ? <Badge tone="warn">Required</Badge> : null}
      </div>
      <input
        className="w-full rounded-2xl border border-line bg-black/20 px-4 py-3 text-sm text-text outline-none transition focus:border-blue-400"
        min={field.type === "number" ? field.min : undefined}
        max={field.type === "number" ? field.max : undefined}
        placeholder={field.placeholder}
        type={field.type}
        value={inputValue}
        onChange={(event) =>
          onChange(
            field.type === "number" && event.target.value !== ""
              ? Number(event.target.value)
              : event.target.value,
          )
        }
      />
      {field.description ? <p className="text-xs text-muted">{field.description}</p> : null}
    </label>
  );
}

export function RunScriptBuilder() {
  const [scriptType, setScriptType] = useState<RunScriptType>("apply-batch");
  const [values, setValues] = useState<RunFormValues>(() => buildInitialValues("apply-batch"));
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [status, setStatus] = useState<ConfigStatus | null>(null);
  const [runs, setRuns] = useState<CurrentRun[]>([]);
  const [latestOutcomes, setLatestOutcomes] = useState<RunProgressReview[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [stoppingRunIds, setStoppingRunIds] = useState<string[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const definition = useMemo(() => getRunScriptDefinition(scriptType), [scriptType]);
  const primaryOptions = useMemo(
    () => RUN_SCRIPT_DEFINITIONS.filter((option) => option.category === "primary"),
    [],
  );
  const advancedOptions = useMemo(
    () => RUN_SCRIPT_DEFINITIONS.filter((option) => option.category !== "primary"),
    [],
  );
  const selectedIsAdvanced = definition.category !== "primary";
  const liveApplyEnabled = isLiveApplyRun(scriptType, values);
  const blockingChecks = useMemo(
    () => (status ? getBlockingRunChecks(scriptType, status.checks, values) : []),
    [scriptType, status, values],
  );
  const readinessPending = status === null;
  const runIsBlocked = readinessPending || blockingChecks.length > 0;
  const activeRuns = useMemo(
    () => runs.filter((run) => run.status === "running" || run.status === "stopping"),
    [runs],
  );
  const currentRun = runs.find((run) => run.id === selectedRunId) ?? runs[0] ?? null;
  const visibleRuns = useMemo(() => {
    const prioritized = [...activeRuns, ...runs.filter((run) => !activeRuns.some((active) => active.id === run.id))];
    return prioritized.slice(0, 4);
  }, [activeRuns, runs]);
  const activeRunKey = activeRuns.map((run) => `${run.id}:${run.status}`).join("|");
  const displayedOutcomes = currentRun
    ? [...(currentRun.progress?.reviews ?? [])].slice(-8).reverse()
    : latestOutcomes.slice(0, 8);

  const generated = useMemo(() => {
    try {
      const args = buildRunArgs(scriptType, values);
      return {
        preview: args.join(" "),
        script: buildGeneratedRunScript(args),
        error: null,
      };
    } catch (error) {
      return {
        preview: `${scriptType} ...`,
        script: "",
        error: error instanceof Error ? error.message : "Failed to build script.",
      };
    }
  }, [scriptType, values]);

  async function refreshStatus() {
    const response = await fetch("/api/config/status", { cache: "no-store" });
    if (response.ok) {
      setStatus((await response.json()) as ConfigStatus);
    }
  }

  async function refreshCurrentRun() {
    const response = await fetch("/api/run/current", { cache: "no-store" });
    if (response.ok) {
      const payload = (await response.json()) as {
        run: CurrentRun | null;
        runs?: CurrentRun[];
        latestOutcomes?: RunProgressReview[];
      };
      const nextRuns = payload.runs ?? (payload.run ? [payload.run] : []);
      setRuns(nextRuns);
      setLatestOutcomes(payload.latestOutcomes ?? []);
      setSelectedRunId((current) =>
        current && nextRuns.some((run) => run.id === current) ? current : nextRuns[0]?.id ?? null,
      );
      setLastSyncedAt(new Date().toLocaleTimeString());
    }
  }

  useEffect(() => {
    void refreshStatus();
    void refreshCurrentRun();
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      void refreshStatus();
      void refreshCurrentRun();
    }, activeRuns.length > 0 ? 1000 : 4000);

    return () => window.clearInterval(interval);
  }, [activeRuns.length]);

  useEffect(() => {
    if (activeRuns.length === 0) return;
    let refreshTimer: number | null = null;
    const refresh = () => {
      if (refreshTimer) return;
      refreshTimer = window.setTimeout(() => {
        refreshTimer = null;
        void refreshCurrentRun();
      }, 300);
    };
    const sources = activeRuns.map((run) => {
      const source = new EventSource(`/api/run/${run.id}/events`);
      source.addEventListener("stdout", refresh);
      source.addEventListener("stderr", refresh);
      source.addEventListener("run_stop_requested", refresh);
      source.addEventListener("run_finished", refresh);
      source.addEventListener("run_failed", refresh);
      source.addEventListener("run_stopped", refresh);
      return source;
    });

    return () => {
      if (refreshTimer) window.clearTimeout(refreshTimer);
      sources.forEach((source) => source.close());
    };
  }, [activeRunKey]);

  async function copyScript() {
    if (!generated.script) {
      return;
    }

    try {
      await navigator.clipboard.writeText(generated.script);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }

    window.setTimeout(() => setCopyState("idle"), 1800);
  }

  async function startRun() {
    setRunError(null);
    if (generated.error) {
      setRunError(generated.error);
      return;
    }

    if (runIsBlocked) {
      setRunError(
        readinessPending
          ? "Readiness checks are still loading."
          : `Resolve the required checks first: ${blockingChecks.map((check) => check.label).join(", ")}.`,
      );
      return;
    }

    setIsStarting(true);
    try {
      const response = await fetch("/api/run/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: scriptType, values }),
      });
      const payload = (await response.json()) as { run?: CurrentRun; runs?: CurrentRun[]; error?: string };
      if (!response.ok || !payload.run) {
        throw new Error(payload.error ?? "Failed to start run.");
      }
      setRuns(payload.runs ?? [payload.run]);
      setSelectedRunId(payload.run.id);
    } catch (error) {
      setRunError(error instanceof Error ? error.message : "Failed to start run.");
    } finally {
      setIsStarting(false);
    }
  }

  async function stopRun(runId: string) {
    setRunError(null);
    setStoppingRunIds((current) => current.includes(runId) ? current : [...current, runId]);
    try {
      const response = await fetch(`/api/run/${runId}/stop`, { method: "POST" });
      const payload = (await response.json()) as { run?: CurrentRun | null; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to stop run.");
      }
      if (payload.run) {
        setRuns((current) => current.map((run) => run.id === payload.run?.id ? payload.run : run));
      }
      window.setTimeout(() => {
        void refreshCurrentRun();
      }, 500);
    } catch (error) {
      setRunError(error instanceof Error ? error.message : "Failed to stop run.");
    } finally {
      setStoppingRunIds((current) => current.filter((id) => id !== runId));
    }
  }

  async function refreshAll() {
    setRunError(null);
    setIsRefreshing(true);
    try {
      await Promise.all([refreshStatus(), refreshCurrentRun()]);
    } catch (error) {
      setRunError(error instanceof Error ? error.message : "Failed to refresh dashboard state.");
    } finally {
      setIsRefreshing(false);
    }
  }

  function selectScript(nextType: RunScriptType) {
    setScriptType(nextType);
    setValues(buildInitialValues(nextType));
    setCopyState("idle");

    if (getRunScriptDefinition(nextType).category !== "primary") {
      setShowAdvanced(true);
    }
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[380px_minmax(0,1fr)]">
      <Card className="space-y-5">
        <SectionTitle
          eyebrow="Options"
          title="Configure a script"
          subtitle="Pick a CLI command and fill the same flags you would pass in terminal. `easy-apply` stays LinkedIn-only, while `apply` includes all-apply continuation."
        />

        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-info">Primary scripts</p>
            <div className="grid gap-2">
              {primaryOptions.map((option) => (
                <button
                  key={option.type}
                  className={`rounded-2xl border px-4 py-3 text-left transition ${
                    option.type === scriptType
                      ? "border-blue-400 bg-blue-400/10"
                      : "border-line bg-black/20 hover:border-slate-500"
                  }`}
                  type="button"
                  onClick={() => selectScript(option.type)}
                >
                  <p className="text-sm font-medium text-text">{option.label}</p>
                  <p className="mt-1 text-xs text-muted">{option.description}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-line bg-black/15">
            <button
              aria-expanded={showAdvanced || selectedIsAdvanced}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
              type="button"
              onClick={() => setShowAdvanced((current) => !current)}
            >
              <div>
                <p className="text-sm font-medium text-text">Advanced scripts</p>
                <p className="mt-1 text-xs text-muted">
                  One-off utilities, single-run flows, and support commands you use less often.
                </p>
              </div>
              <Badge tone="neutral">{advancedOptions.length}</Badge>
            </button>

            {showAdvanced || selectedIsAdvanced ? (
              <div className="grid gap-2 border-t border-line px-4 pb-4 pt-2">
                {advancedOptions.map((option) => (
                  <button
                    key={option.type}
                    className={`rounded-2xl border px-4 py-3 text-left transition ${
                      option.type === scriptType
                        ? "border-blue-400 bg-blue-400/10"
                        : "border-line bg-black/20 hover:border-slate-500"
                    }`}
                    type="button"
                    onClick={() => selectScript(option.type)}
                  >
                    <p className="text-sm font-medium text-text">{option.label}</p>
                    <p className="mt-1 text-xs text-muted">{option.description}</p>
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <div className="space-y-4">
          {definition.fields.map((field) => (
            <FieldInput
              key={field.key}
              field={field}
              value={values[field.key]}
              onChange={(nextValue) =>
                setValues((current) => ({
                  ...current,
                  [field.key]: nextValue,
                }))
              }
            />
          ))}
        </div>

        {definition.caution ? (
          <div
            className={`rounded-2xl border p-4 ${
              liveApplyEnabled
                ? "border-rose-400/40 bg-rose-400/15 text-rose-100"
                : "border-amber-400/25 bg-amber-400/10 text-amber-100"
            }`}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
              <div>
                <p className="text-sm font-semibold">
                  {liveApplyEnabled ? "Live application is enabled" : "Dry-run safety is enabled"}
                </p>
                <p className="mt-1 text-xs leading-5">
                  {liveApplyEnabled
                    ? definition.caution
                    : "The engine will stop before final submission. Clear Dry Run only when you intend to use the live path."}
                </p>
              </div>
            </div>
          </div>
        ) : null}
      </Card>

      <div className="space-y-5">
        <Card className="space-y-4 border-slate-700/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.97),rgba(15,23,42,0.86))]">
          <SectionTitle
            eyebrow="Control"
            title="Run from dashboard"
            subtitle={`Two isolated slots are available. ${activeRuns.length}/2 are active; each run has its own process, progress, and stop control.`}
          />

          <div className="grid gap-3 lg:grid-cols-2">
            {visibleRuns.map((run) => {
              const active = run.status === "running" || run.status === "stopping";
              const selected = run.id === currentRun?.id;
              const runStatus = displayStatus(run);
              return (
                <div
                  key={run.id}
                  className={`rounded-2xl border p-4 transition ${selected ? "border-blue-400 bg-blue-400/10" : "border-line bg-black/20 hover:border-slate-500"}`}
                >
                  <button className="block w-full text-left" type="button" onClick={() => setSelectedRunId(run.id)}>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone={statusTone(runStatus)}>{runStatus}</Badge>
                      <Badge tone={executionTone(run.executionMode)}>{run.executionMode.toUpperCase()}</Badge>
                      <Badge tone="neutral">{run.id.slice(0, 8)}</Badge>
                    </div>
                    <p className="mt-3 truncate text-sm font-semibold text-text">{run.mode}</p>
                    <p className="mt-1 truncate text-xs text-muted">
                      {run.progress?.currentActivity?.label ?? run.command}
                    </p>
                  </button>
                  {active ? (
                    <button
                      aria-label={`Stop ${run.id} run`}
                      className="mt-3 inline-flex items-center gap-2 rounded-xl border border-line px-3 py-2 text-xs font-semibold text-text"
                      disabled={stoppingRunIds.includes(run.id) || run.status === "stopping"}
                      type="button"
                      onClick={() => void stopRun(run.id)}
                    >
                      <CircleStop className="size-4" aria-hidden="true" />
                      {stoppingRunIds.includes(run.id) || run.status === "stopping" ? "Stopping" : "Stop this run"}
                    </button>
                  ) : null}
                </div>
              );
            })}
            {visibleRuns.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-line bg-black/10 p-4 text-sm text-muted">
                Both run slots are available.
              </div>
            ) : null}
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {[
              ["Evaluated", currentRun?.progress?.evaluatedCount ?? 0],
              ["Apply", currentRun?.progress?.applyDecisionCount ?? 0],
              ["Submitted", currentRun?.progress?.submittedCount ?? 0],
              ["Failed", currentRun?.progress?.failedCount ?? 0],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-line bg-black/20 p-4">
                <p className="text-xs uppercase tracking-[0.2em] text-muted">{label}</p>
                <p className="mt-2 text-2xl font-semibold text-text">{value}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Badge tone={statusTone(displayStatus(currentRun))}>
              {currentRun ? displayStatus(currentRun) : "idle"}
            </Badge>
            {currentRun?.progress?.latestArtifact ? (
              <Badge tone="apply">Artifact ready</Badge>
            ) : null}
            {currentRun ? (
              <Badge tone={executionTone(currentRun.executionMode)}>{currentRun.executionMode.toUpperCase()}</Badge>
            ) : null}
            {lastSyncedAt ? <Badge tone="neutral">Updated {lastSyncedAt}</Badge> : null}
          </div>

          {currentRun?.progress?.currentActivity ? (
            <div className="rounded-2xl border border-blue-400/25 bg-blue-400/10 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={activityTone(currentRun.progress.currentActivity.stage)}>
                  {currentRun.progress.currentActivity.stage}
                </Badge>
                {currentRun.progress.currentActivity.score != null ? (
                  <Badge tone="neutral">Score {currentRun.progress.currentActivity.score}</Badge>
                ) : null}
                {currentRun.progress.currentActivity.decision ? (
                  <Badge tone={currentRun.progress.currentActivity.decision === "APPLY" ? "apply" : "warn"}>
                    {currentRun.progress.currentActivity.decision}
                  </Badge>
                ) : null}
              </div>
              <p className="mt-3 text-sm font-semibold text-text">
                {currentRun.progress.currentActivity.label}
              </p>
              {currentRun.progress.currentActivity.detail ? (
                <p className="mt-1 text-xs text-muted">{currentRun.progress.currentActivity.detail}</p>
              ) : null}
              {currentRun.progress.currentActivity.jobUrl ? (
                <p className="mt-2 break-all text-xs text-muted">{currentRun.progress.currentActivity.jobUrl}</p>
              ) : null}
            </div>
          ) : null}

          {runError || generated.error ? (
            <div className="rounded-2xl border border-rose-400/20 bg-rose-400/10 p-4 text-sm text-rose-200">
              {runError ?? generated.error}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button
              className="inline-flex items-center gap-2 rounded-2xl bg-blue-500 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={Boolean(generated.error) || runIsBlocked || isStarting || activeRuns.length >= 2}
              type="button"
              onClick={startRun}
            >
              <Play className="size-4" aria-hidden="true" />
              {isStarting ? "Starting" : liveApplyEnabled ? "Start LIVE Run" : "Start Run"}
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-2xl border border-line bg-black/20 px-4 py-3 text-sm font-semibold text-text transition hover:border-slate-500"
              disabled={isRefreshing}
              type="button"
              onClick={() => void refreshAll()}
            >
              <RefreshCw className={`size-4 ${isRefreshing ? "animate-spin" : ""}`} aria-hidden="true" />
              {isRefreshing ? "Refreshing" : "Refresh"}
            </button>
          </div>

          {currentRun ? (
            <div className="rounded-2xl border border-line bg-black/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-info">Active command</p>
              <p className="mt-2 break-all font-mono text-xs text-slate-200">{currentRun.command}</p>
              <p className="mt-2 break-all text-xs text-muted">{currentRun.cwd}</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-line bg-black/20 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-info">Command Preview</p>
              <p className="mt-2 break-all font-mono text-xs text-slate-200">{generated.preview}</p>
            </div>
          )}
        </Card>

        <Card className="space-y-4">
          <SectionTitle
            eyebrow="Preflight"
            title="Local readiness"
            subtitle="These checks cover the engine folder, stored data, resume, LinkedIn session, and LM Studio connection."
          />
          <div
            className={`rounded-2xl border p-4 ${
              readinessPending
                ? "border-line bg-black/20"
                : blockingChecks.length > 0
                  ? "border-amber-400/25 bg-amber-400/10"
                  : "border-emerald-400/25 bg-emerald-400/10"
            }`}
          >
            <p className="text-sm font-semibold text-text">
              {readinessPending
                ? "Checking required services..."
                : blockingChecks.length > 0
                  ? `${blockingChecks.length} required check${blockingChecks.length === 1 ? "" : "s"} block this run`
                  : `${definition.label} is ready to start`}
            </p>
            {blockingChecks.length > 0 ? (
              <p className="mt-1 text-xs text-amber-100">
                {blockingChecks.map((check) => check.label).join(" · ")}
              </p>
            ) : null}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {(status?.checks ?? []).map((check) => (
              <div key={check.key} className="rounded-2xl border border-line bg-black/20 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-text">{check.label}</p>
                  {check.ok ? (
                    <CheckCircle2 className="size-4 text-emerald-300" aria-hidden="true" />
                  ) : (
                    <AlertTriangle className="size-4 text-amber-300" aria-hidden="true" />
                  )}
                </div>
                <p className="mt-2 break-all text-xs text-muted">{check.detail}</p>
              </div>
            ))}
            {!status ? (
              <div className="rounded-2xl border border-line bg-black/20 p-4 text-sm text-muted">
                Loading checks...
              </div>
            ) : null}
          </div>
        </Card>

        <Card className="space-y-3">
          <SectionTitle
            eyebrow="Progress"
            title="Latest job outcomes"
            subtitle={currentRun
              ? "Rows appear from review history or the selected run artifact."
              : "Showing the latest persisted outcomes even after the dashboard process restarts."}
          />
          <div className="space-y-3">
            {displayedOutcomes.map((review) => (
              <div key={`${review.createdAt}-${review.jobUrl}-${review.status}`} className="rounded-2xl border border-line bg-black/20 p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone={outcomeTone(review)}>{review.status}</Badge>
                  {review.score != null ? <Badge tone="neutral">Score {review.score}</Badge> : null}
                  {review.decision ? <Badge tone={review.decision === "APPLY" ? "info" : "warn"}>{review.decision}</Badge> : null}
                </div>
                <p className="mt-3 text-sm font-semibold text-text">
                  {review.title ?? "Unknown role"}
                  {review.company ? ` at ${review.company}` : ""}
                </p>
                <p className="mt-1 text-xs text-muted">{review.summary ?? review.jobUrl}</p>
              </div>
            ))}
            {currentRun && (currentRun.progress?.reviews.length ?? 0) === 0 ? (
              <div className="rounded-2xl border border-line bg-black/20 p-4 text-sm text-muted">
                Waiting for the first persisted review row.
              </div>
            ) : null}
            {!currentRun && displayedOutcomes.length === 0 ? (
              <div className="rounded-2xl border border-line bg-black/20 p-4 text-sm text-muted">
                No persisted job outcomes are available yet.
              </div>
            ) : null}
          </div>
        </Card>

        <Card className="space-y-4">
          <SectionTitle
            eyebrow="Fallback"
            title="Generated PowerShell wrapper"
            subtitle="Use this if you want to run the same command manually."
          />
          <div className="overflow-hidden rounded-[28px] border border-line bg-black/30 shadow-panel">
            <pre className="max-h-[420px] overflow-auto p-6 text-sm leading-7 text-slate-100">
              <code>{generated.script || "Script will appear here when the required fields are filled."}</code>
            </pre>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              className="inline-flex items-center gap-2 rounded-2xl border border-line bg-black/20 px-4 py-3 text-sm font-semibold text-text transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!generated.script}
              type="button"
              onClick={copyScript}
            >
              <Copy className="size-4" aria-hidden="true" />
              Copy Script
            </button>
            <div className="inline-flex items-center gap-2 text-xs text-muted">
              <Terminal className="size-4" aria-hidden="true" />
              {copyState === "copied" ? "Copied" : copyState === "failed" ? "Copy failed" : "CLI fallback"}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
