import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from "node:child_process";
import { randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";
import { appendFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { getEngineRoot } from "./engine-paths";
import {
  exclusiveResourcesForArgs,
  executionModeForArgs,
  type RunExecutionMode,
} from "./run-resources";
import {
  readRunProgress,
  type RunCurrentActivity,
  type RunProgressSummary,
} from "./run-progress";

export const MAX_CONCURRENT_RUNS = 2;
const MAX_RETAINED_RUNS = 20;
const MAX_EVENTS_PER_RUN = 500;

export type EngineRunStatus = "running" | "stopping" | "completed" | "failed" | "stopped";

export type EngineRunEvent = {
  id: string;
  sequence: number;
  runId: string;
  type:
    | "run_started"
    | "stdout"
    | "stderr"
    | "run_stop_requested"
    | "run_stop_failed"
    | "run_finished"
    | "run_failed"
    | "run_stopped";
  message: string;
  createdAt: string;
};

export type EngineRunRecord = {
  id: string;
  args: string[];
  mode: string;
  executionMode: RunExecutionMode;
  correlationMode: "run-id" | "legacy-time";
  exclusiveResources: string[];
  command: string;
  cwd: string;
  startedAt: string;
  finishedAt: string | null;
  status: EngineRunStatus;
  exitCode: number | null;
  pid: number | null;
  revision: number;
  events: EngineRunEvent[];
};

export type EngineRunSnapshot = EngineRunRecord & { progress: RunProgressSummary | null };

type RunEntry = { run: EngineRunRecord; child: ChildProcessWithoutNullStreams | null };
type RunManager = {
  version: 2;
  emitter: EventEmitter;
  entries: Map<string, RunEntry>;
  order: string[];
};
type LegacyRunManager = {
  emitter?: EventEmitter;
  current?: EngineRunRecord | null;
  child?: ChildProcessWithoutNullStreams | null;
};

export class RunCapacityError extends Error {
  readonly code = "RUN_CAPACITY_FULL";
  constructor(readonly maxActive = MAX_CONCURRENT_RUNS) {
    super(`At most ${maxActive} engine runs can be active at once.`);
  }
}

export class RunResourceConflictError extends Error {
  readonly code = "RUN_RESOURCE_CONFLICT";
  constructor(readonly resources: string[]) {
    super(`Another active run is using: ${resources.join(", ")}.`);
  }
}

export class RunNotFoundError extends Error {
  readonly code = "RUN_NOT_FOUND";
  constructor(readonly runId: string) {
    super("Engine run was not found.");
  }
}

export class RunIdRequiredError extends Error {
  readonly code = "RUN_ID_REQUIRED";
  constructor() {
    super("A run id is required when more than one engine run is active.");
  }
}

const globalKey = "__jobToolDashboardRunManager";
const globalStore = globalThis as unknown as Record<string, RunManager | LegacyRunManager | undefined>;

function initializeManager(existing: RunManager | LegacyRunManager | undefined): RunManager {
  if (existing && "version" in existing && existing.version === 2) {
    for (const entry of existing.entries.values()) {
      const partial = entry.run as EngineRunRecord & { correlationMode?: EngineRunRecord["correlationMode"] };
      partial.correlationMode ??= entry.run.events.every((event) => typeof event.sequence === "number")
        ? "run-id"
        : "legacy-time";
    }
    return existing;
  }

  const next: RunManager = {
    version: 2,
    emitter: existing?.emitter ?? new EventEmitter(),
    entries: new Map(),
    order: [],
  };
  const legacy = existing as LegacyRunManager | undefined;
  if (legacy?.current) {
    const migrated = {
      ...legacy.current,
      executionMode: legacy.current.executionMode ?? executionModeForArgs(legacy.current.args),
      correlationMode: "legacy-time" as const,
      exclusiveResources: legacy.current.exclusiveResources ?? exclusiveResourcesForArgs(legacy.current.args),
      revision: legacy.current.revision ?? legacy.current.events.length,
    };
    next.entries.set(migrated.id, { run: migrated, child: legacy.child ?? null });
    next.order.push(migrated.id);
  }
  return next;
}

const manager = initializeManager(globalStore[globalKey]);
globalStore[globalKey] = manager;

function isActive(status: EngineRunStatus) {
  return status === "running" || status === "stopping";
}

function runtimeDir() {
  const directory = path.join(process.cwd(), ".runtime", "runs");
  mkdirSync(directory, { recursive: true });
  return directory;
}

function persistEvent(event: EngineRunEvent) {
  try {
    appendFileSync(path.join(runtimeDir(), `${event.runId}.jsonl`), `${JSON.stringify(event)}\n`, "utf8");
  } catch {
    // Telemetry failures must not terminate the process manager.
  }
}

function pushEvent(run: EngineRunRecord, event: Omit<EngineRunEvent, "id" | "sequence" | "runId" | "createdAt">) {
  run.revision += 1;
  const fullEvent: EngineRunEvent = {
    ...event,
    id: randomUUID(),
    sequence: run.revision,
    runId: run.id,
    createdAt: new Date().toISOString(),
  };
  run.events.push(fullEvent);
  if (run.events.length > MAX_EVENTS_PER_RUN) {
    run.events.splice(0, run.events.length - MAX_EVENTS_PER_RUN);
  }
  persistEvent(fullEvent);
  manager.emitter.emit(run.id, fullEvent);
}

function npmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function npmCliPath() {
  return path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js");
}

function sanitizedProcessEnv(): NodeJS.ProcessEnv {
  return Object.fromEntries(
    Object.entries(process.env).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  ) as NodeJS.ProcessEnv;
}

function activeEntries() {
  return manager.order
    .map((id) => manager.entries.get(id))
    .filter((entry): entry is RunEntry => entry !== undefined)
    .filter((entry) => isActive(entry.run.status));
}

function snapshotFor(entry: RunEntry): EngineRunSnapshot {
  return { ...entry.run, events: [...entry.run.events], progress: readProgressSafe(entry.run) };
}

export function getRunRegistryState() {
  const runs = [...manager.order]
    .reverse()
    .map((id) => manager.entries.get(id))
    .filter((entry): entry is RunEntry => Boolean(entry))
    .map(snapshotFor);
  const activeCount = runs.filter((run) => isActive(run.status)).length;
  return {
    runs,
    activeCount,
    maxActive: MAX_CONCURRENT_RUNS,
    available: Math.max(0, MAX_CONCURRENT_RUNS - activeCount),
  };
}

export function getRuns(): EngineRunSnapshot[] {
  return getRunRegistryState().runs;
}

export function getRun(runId: string): EngineRunSnapshot | null {
  const entry = manager.entries.get(runId);
  return entry ? snapshotFor(entry) : null;
}

export function getRunEvents(runId: string): EngineRunEvent[] | null {
  const entry = manager.entries.get(runId);
  return entry ? [...entry.run.events] : null;
}

export function getCurrentRun(): EngineRunSnapshot | null {
  const state = getRunRegistryState();
  return state.runs.find((run) => isActive(run.status)) ?? state.runs[0] ?? null;
}

function readProgressSafe(run: EngineRunRecord): RunProgressSummary | null {
  try {
    const progress = readRunProgress({
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
      runId: run.correlationMode === "run-id" ? run.id : undefined,
      mode: run.mode,
    });
    return alignProgressWithRunLifecycle(run, progress);
  } catch {
    return null;
  }
}

function alignProgressWithRunLifecycle(run: EngineRunRecord, progress: RunProgressSummary): RunProgressSummary {
  if (run.status === "running") return progress;

  const lastObservedActivity = progress.currentActivity;
  const completedOutcome = run.status === "completed" ? progress.terminalOutcome : null;
  const terminalEvent = [...run.events].reverse().find((event) =>
    event.type === `run_${run.status}` || (run.status === "completed" && event.type === "run_finished"),
  );
  let lifecycleStage: RunCurrentActivity["stage"] = run.status;
  let copy: { label: string; detail: string };
  if (completedOutcome?.status === "partial") {
    lifecycleStage = "partial";
    copy = {
      label: "Run completed with partial outcome",
      detail: completedOutcome.reason ?? "The engine completed, but one or more job outcomes were incomplete.",
    };
  } else if (completedOutcome?.status === "failed") {
    lifecycleStage = "failed";
    copy = {
      label: "Run completed with failed outcome",
      detail: completedOutcome.reason ?? "The engine process exited cleanly, but the batch outcome failed.",
    };
  } else if (run.status === "stopping") {
    copy = { label: "Stopping run", detail: terminalEvent?.message ?? "Waiting for the engine process to exit." };
  } else {
    copy = {
      completed: { label: "Run completed", detail: terminalEvent?.message ?? "Engine run completed." },
      failed: { label: "Run failed", detail: terminalEvent?.message ?? "Engine run failed." },
      stopped: { label: "Run stopped", detail: terminalEvent?.message ?? "Engine run stopped." },
    }[run.status];
  }
  const lifecycleActivity: RunCurrentActivity = {
    stage: lifecycleStage,
    label: copy.label,
    detail: copy.detail,
    jobUrl: lastObservedActivity?.jobUrl ?? null,
    title: lastObservedActivity?.title ?? null,
    company: lastObservedActivity?.company ?? null,
    location: lastObservedActivity?.location ?? null,
    score: lastObservedActivity?.score ?? null,
    decision: lastObservedActivity?.decision ?? null,
    updatedAt: run.finishedAt ?? terminalEvent?.createdAt ?? run.startedAt,
  };
  return { ...progress, currentActivity: lifecycleActivity, lastObservedActivity };
}

function pruneRetainedRuns() {
  while (manager.order.length > MAX_RETAINED_RUNS) {
    const removableIndex = manager.order.findIndex((id) => {
      const entry = manager.entries.get(id);
      return entry && !isActive(entry.run.status);
    });
    if (removableIndex < 0) return;
    const [id] = manager.order.splice(removableIndex, 1);
    manager.entries.delete(id);
  }
}

function assertCanStart(resources: string[]) {
  const active = activeEntries();
  if (active.length >= MAX_CONCURRENT_RUNS) throw new RunCapacityError();

  const claimed = new Set(active.flatMap((entry) => entry.run.exclusiveResources));
  const conflicts = resources.filter((resource) => claimed.has(resource));
  if (conflicts.length > 0) throw new RunResourceConflictError([...new Set(conflicts)]);
}

function finalizeRun(
  entry: RunEntry,
  status: Extract<EngineRunStatus, "completed" | "failed" | "stopped">,
  message: string,
  exitCode: number | null,
) {
  if (!isActive(entry.run.status)) return;
  entry.run.status = status;
  entry.run.exitCode = exitCode;
  entry.run.finishedAt = new Date().toISOString();
  entry.child = null;
  pushEvent(entry.run, {
    type: status === "completed" ? "run_finished" : status === "failed" ? "run_failed" : "run_stopped",
    message,
  });
  pruneRetainedRuns();
}

export function startEngineRun(args: string[]): EngineRunRecord {
  if (args.length === 0) throw new Error("At least one engine argument is required.");

  const exclusiveResources = exclusiveResourcesForArgs(args);
  assertCanStart(exclusiveResources);

  const cwd = getEngineRoot();
  const commandArgs = ["run", "dev", "--", ...args];
  const run: EngineRunRecord = {
    id: randomUUID(),
    args: [...args],
    mode: args[0] ?? "unknown",
    executionMode: executionModeForArgs(args),
    correlationMode: "run-id",
    exclusiveResources,
    command: `${npmCommand()} ${commandArgs.join(" ")}`,
    cwd,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    status: "running",
    exitCode: null,
    pid: null,
    revision: 0,
    events: [],
  };
  const entry: RunEntry = { run, child: null };
  manager.entries.set(run.id, entry);
  manager.order.push(run.id);

  let child: ChildProcessWithoutNullStreams;
  try {
    child = spawn(process.execPath, [npmCliPath(), ...commandArgs], {
      cwd,
      env: { ...sanitizedProcessEnv(), FORCE_COLOR: "0", JOB_TOOL_RUN_ID: run.id },
      shell: false,
      windowsHide: true,
    });
  } catch (error) {
    finalizeRun(entry, "failed", error instanceof Error ? error.message : "Failed to spawn engine process.", null);
    return run;
  }

  entry.child = child;
  run.pid = child.pid ?? null;
  pushEvent(run, { type: "run_started", message: `Started ${run.mode}.` });

  child.stdout.on("data", (chunk: Buffer) => {
    for (const line of chunk.toString("utf8").split(/\r?\n/).filter(Boolean)) {
      pushEvent(run, { type: "stdout", message: line });
    }
  });
  child.stderr.on("data", (chunk: Buffer) => {
    for (const line of chunk.toString("utf8").split(/\r?\n/).filter(Boolean)) {
      pushEvent(run, { type: "stderr", message: line });
    }
  });
  child.on("error", (error) => finalizeRun(entry, "failed", error.message, run.exitCode));
  child.on("close", (code) => {
    run.exitCode = code;
    if (!isActive(run.status)) return;
    if (run.status === "stopping") finalizeRun(entry, "stopped", "Engine run stopped.", code);
    else if (code === 0) finalizeRun(entry, "completed", "Engine run completed.", code);
    else finalizeRun(entry, "failed", `Engine run exited with code ${code ?? "unknown"}.`, code);
  });

  pruneRetainedRuns();
  return run;
}

export function stopEngineRun(runId: string): EngineRunRecord {
  const entry = manager.entries.get(runId);
  if (!entry) throw new RunNotFoundError(runId);
  if (!isActive(entry.run.status) || entry.run.status === "stopping") return entry.run;

  entry.run.status = "stopping";
  pushEvent(entry.run, { type: "run_stop_requested", message: "Stopping engine run." });
  if (!stopProcessTree(entry)) {
    entry.run.status = "running";
    pushEvent(entry.run, { type: "run_stop_failed", message: "Failed to stop the engine process." });
  }
  return entry.run;
}

export function stopCurrentRun(runId?: string): EngineRunRecord | null {
  if (runId) return stopEngineRun(runId);
  const active = activeEntries();
  if (active.length > 1) throw new RunIdRequiredError();
  if (active.length === 1) return stopEngineRun(active[0].run.id);
  return getCurrentRun();
}

function stopProcessTree(entry: RunEntry): boolean {
  const pid = entry.child?.pid;
  if (pid && process.platform === "win32") {
    const result = spawnSync("taskkill.exe", ["/pid", String(pid), "/T", "/F"], {
      windowsHide: true,
      stdio: "ignore",
    });
    if (result.status === 0) return true;
  }
  if (!entry.child) return false;
  return entry.child.kill() !== false;
}

export function subscribeToRun(runId: string, listener: (event: EngineRunEvent) => void) {
  manager.emitter.on(runId, listener);
  return () => manager.emitter.off(runId, listener);
}
