import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from "node:child_process";
import { randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";
import { mkdirSync, appendFileSync } from "node:fs";
import path from "node:path";
import { getEngineRoot } from "./engine-paths";
import { readRunProgress, type RunProgressSummary } from "./run-progress";

export type EngineRunEvent = {
  id: string;
  runId: string;
  type: "run_started" | "stdout" | "stderr" | "run_finished" | "run_failed" | "run_stopped";
  message: string;
  createdAt: string;
};

export type EngineRunRecord = {
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
  events: EngineRunEvent[];
};

type RunManager = {
  emitter: EventEmitter;
  current: EngineRunRecord | null;
  child: ChildProcessWithoutNullStreams | null;
};

const globalKey = "__jobToolDashboardRunManager";
const manager = ((globalThis as unknown as Record<string, RunManager | undefined>)[globalKey] ??= {
  emitter: new EventEmitter(),
  current: null,
  child: null,
});

function runtimeDir() {
  const directory = path.join(process.cwd(), ".runtime", "runs");
  mkdirSync(directory, { recursive: true });
  return directory;
}

function persistEvent(event: EngineRunEvent) {
  appendFileSync(path.join(runtimeDir(), `${event.runId}.jsonl`), `${JSON.stringify(event)}\n`, "utf8");
}

function pushEvent(run: EngineRunRecord, event: Omit<EngineRunEvent, "id" | "runId" | "createdAt">) {
  const fullEvent: EngineRunEvent = {
    ...event,
    id: randomUUID(),
    runId: run.id,
    createdAt: new Date().toISOString(),
  };
  run.events.push(fullEvent);
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

export function getCurrentRun(): (EngineRunRecord & { progress: RunProgressSummary | null }) | null {
  const run = manager.current;
  if (!run) {
    return null;
  }

  return {
    ...run,
    progress: readProgressSafe(run),
  };
}

function readProgressSafe(run: EngineRunRecord): RunProgressSummary | null {
  try {
    return readRunProgress({
      startedAt: run.startedAt,
      mode: run.mode,
    });
  } catch {
    return null;
  }
}

export function startEngineRun(args: string[]): EngineRunRecord {
  if (manager.current?.status === "running") {
    throw new Error("An engine run is already active.");
  }

  if (args.length === 0) {
    throw new Error("At least one engine argument is required.");
  }

  const cwd = getEngineRoot();
  const commandArgs = ["run", "dev", "--", ...args];
  const run: EngineRunRecord = {
    id: randomUUID(),
    args,
    mode: args[0] ?? "unknown",
    command: `${npmCommand()} ${commandArgs.join(" ")}`,
    cwd,
    startedAt: new Date().toISOString(),
    finishedAt: null,
    status: "running",
    exitCode: null,
    pid: null,
    events: [],
  };

  let child: ChildProcessWithoutNullStreams;
  try {
    child = spawn(process.execPath, [npmCliPath(), ...commandArgs], {
      cwd,
      env: {
        ...sanitizedProcessEnv(),
        FORCE_COLOR: "0",
      },
      shell: false,
      windowsHide: true,
    });
  } catch (error) {
    run.status = "failed";
    run.finishedAt = new Date().toISOString();
    run.events.push({
      id: randomUUID(),
      runId: run.id,
      type: "run_failed",
      message: error instanceof Error ? error.message : "Failed to spawn engine process.",
      createdAt: run.finishedAt,
    });
    manager.current = run;
    return run;
  }

  manager.current = run;
  manager.child = child;
  run.pid = child.pid ?? null;

  pushEvent(run, {
    type: "run_started",
    message: `Started ${run.mode}.`,
  });

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

  child.on("error", (error) => {
    run.status = "failed";
    run.finishedAt = new Date().toISOString();
    pushEvent(run, {
      type: "run_failed",
      message: error.message,
    });
  });

  child.on("close", (code) => {
    run.exitCode = code;
    run.finishedAt = new Date().toISOString();
    if (run.status === "stopped") {
      pushEvent(run, {
        type: "run_stopped",
        message: "Engine run stopped.",
      });
    } else if (code === 0) {
      run.status = "completed";
      pushEvent(run, {
        type: "run_finished",
        message: "Engine run completed.",
      });
    } else {
      run.status = "failed";
      pushEvent(run, {
        type: "run_failed",
        message: `Engine run exited with code ${code ?? "unknown"}.`,
      });
    }
    manager.child = null;
  });

  return run;
}

export function stopCurrentRun(): EngineRunRecord | null {
  const run = manager.current;
  if (!run || run.status !== "running") {
    return run;
  }

  run.status = "stopped";
  pushEvent(run, {
    type: "run_stopped",
    message: "Stopping engine run.",
  });
  stopProcessTree(manager.child?.pid);
  return run;
}

function stopProcessTree(pid: number | undefined) {
  if (!pid) {
    manager.child?.kill();
    return;
  }

  if (process.platform === "win32") {
    const result = spawnSync("taskkill.exe", ["/pid", String(pid), "/T", "/F"], {
      windowsHide: true,
      stdio: "ignore",
    });
    if (result.status === 0) {
      return;
    }
  }

  manager.child?.kill();
}

export function subscribeToRun(runId: string, listener: (event: EngineRunEvent) => void) {
  manager.emitter.on(runId, listener);
  return () => manager.emitter.off(runId, listener);
}
