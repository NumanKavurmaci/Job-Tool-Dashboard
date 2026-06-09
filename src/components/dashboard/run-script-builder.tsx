"use client";

import { AlertTriangle, CheckCircle2, CircleStop, Copy, Play, RefreshCw, Terminal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge, Card, SectionTitle } from "@/components/ui";
import {
  RUN_SCRIPT_DEFINITIONS,
  buildRunArgs,
  buildGeneratedRunScript,
  getRunScriptDefinition,
  type RunFieldDefinition,
  type RunFormValues,
  type RunScriptType,
} from "@/lib/run-config";

type ConfigStatus = {
  ready: boolean;
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
  status: "running" | "completed" | "failed" | "stopped";
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
    currentActivity: {
      stage: "starting" | "scanning" | "evaluating" | "applying" | "submitted" | "failed" | "completed" | "stopped";
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

function statusTone(status: CurrentRun["status"] | undefined) {
  if (status === "running") return "info" as const;
  if (status === "completed") return "apply" as const;
  if (status === "failed") return "skip" as const;
  if (status === "stopped") return "warn" as const;
  return "neutral" as const;
}

function outcomeTone(review: RunProgressReview) {
  if (review.status === "SUBMITTED") return "apply" as const;
  if (review.status === "FAILED") return "skip" as const;
  if (review.status.startsWith("SKIPPED")) return "warn" as const;
  if (review.decision === "APPLY") return "info" as const;
  return "neutral" as const;
}

function isLiveApplyRun(type: RunScriptType, values: RunFormValues) {
  return ["apply", "apply-batch", "easy-apply", "easy-apply-batch", "external-apply"].includes(type)
    && values.dryRun !== true;
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

  return (
    <label className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-text">{field.label}</span>
        {field.required ? <Badge tone="warn">Required</Badge> : null}
      </div>
      <input
        className="w-full rounded-2xl border border-line bg-black/20 px-4 py-3 text-sm text-text outline-none transition focus:border-blue-400"
        min={field.type === "number" ? field.min : undefined}
        placeholder={field.placeholder}
        type={field.type}
        value={field.type === "number" ? Number(value ?? field.defaultValue ?? 0) : String(value ?? "")}
        onChange={(event) =>
          onChange(field.type === "number" ? Number(event.target.value) : event.target.value)
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
  const [currentRun, setCurrentRun] = useState<CurrentRun | null>(null);
  const [runError, setRunError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [isStopping, setIsStopping] = useState(false);
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
      const payload = (await response.json()) as { run: CurrentRun | null };
      setCurrentRun(payload.run);
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
    }, currentRun?.status === "running" ? 1000 : 4000);

    return () => window.clearInterval(interval);
  }, [currentRun?.status]);

  useEffect(() => {
    if (!currentRun?.id || currentRun.status !== "running") {
      return;
    }

    const source = new EventSource(`/api/run/${currentRun.id}/events`);
    const refresh = () => void refreshCurrentRun();
    source.addEventListener("stdout", refresh);
    source.addEventListener("stderr", refresh);
    source.addEventListener("run_finished", refresh);
    source.addEventListener("run_failed", refresh);
    source.addEventListener("run_stopped", refresh);

    return () => source.close();
  }, [currentRun?.id, currentRun?.status]);

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

    setIsStarting(true);
    try {
      const response = await fetch("/api/run/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: scriptType, values }),
      });
      const payload = (await response.json()) as { run?: CurrentRun; error?: string };
      if (!response.ok || !payload.run) {
        throw new Error(payload.error ?? "Failed to start run.");
      }
      setCurrentRun(payload.run);
    } catch (error) {
      setRunError(error instanceof Error ? error.message : "Failed to start run.");
    } finally {
      setIsStarting(false);
    }
  }

  async function stopRun() {
    setRunError(null);
    setIsStopping(true);
    try {
      const response = await fetch("/api/run/stop", { method: "POST" });
      const payload = (await response.json()) as { run?: CurrentRun | null; error?: string };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to stop run.");
      }
      setCurrentRun(payload.run ?? null);
      window.setTimeout(() => {
        void refreshCurrentRun();
      }, 500);
    } catch (error) {
      setRunError(error instanceof Error ? error.message : "Failed to stop run.");
    } finally {
      setIsStopping(false);
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
      </Card>

      <div className="space-y-5">
        <Card className="space-y-4 border-slate-700/80 bg-[linear-gradient(180deg,rgba(15,23,42,0.97),rgba(15,23,42,0.86))]">
          <SectionTitle
            eyebrow="Control"
            title="Run from dashboard"
            subtitle="The dashboard starts the engine in the sibling Job Tool folder and follows the database, logs, and artifacts it creates."
          />

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
            <Badge tone={statusTone(currentRun?.status)}>
              {currentRun ? currentRun.status : "idle"}
            </Badge>
            {currentRun?.progress?.latestArtifact ? (
              <Badge tone="apply">Artifact ready</Badge>
            ) : null}
            {isLiveApplyRun(scriptType, values) ? (
              <Badge tone="neutral">Live apply</Badge>
            ) : (
              <Badge tone="info">Dry or non-submit</Badge>
            )}
            {lastSyncedAt ? <Badge tone="neutral">Updated {lastSyncedAt}</Badge> : null}
          </div>

          {currentRun?.progress?.currentActivity ? (
            <div className="rounded-2xl border border-blue-400/25 bg-blue-400/10 p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone="info">{currentRun.progress.currentActivity.stage}</Badge>
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
              disabled={Boolean(generated.error) || isStarting || currentRun?.status === "running"}
              type="button"
              onClick={startRun}
            >
              <Play className="size-4" aria-hidden="true" />
              {isStarting ? "Starting" : "Start Run"}
            </button>
            <button
              className="inline-flex items-center gap-2 rounded-2xl border border-line bg-black/20 px-4 py-3 text-sm font-semibold text-text transition hover:border-slate-500 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={currentRun?.status !== "running" || isStopping}
              type="button"
              onClick={stopRun}
            >
              <CircleStop className="size-4" aria-hidden="true" />
              {isStopping ? "Stopping" : "Stop"}
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
            subtitle="Rows appear as the engine writes review history for this run."
          />
          <div className="space-y-3">
            {(currentRun?.progress?.reviews ?? []).slice(-8).reverse().map((review) => (
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
            {!currentRun ? (
              <div className="rounded-2xl border border-line bg-black/20 p-4 text-sm text-muted">
                No dashboard-started run is active yet.
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
