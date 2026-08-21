import { buildRunArgs } from "@/lib/run-config";
import { readEngineConfigStatus } from "@/lib/engine-status";
import {
  getRunRegistryState,
  RunCapacityError,
  RunResourceConflictError,
  startEngineRun,
} from "@/lib/engine-runner";
import { getBlockingRunChecks } from "@/lib/run-readiness";
import { parseRunStartPayload, RunRequestValidationError } from "@/lib/run-request";
import { guardMutationRequest, jsonNoStore } from "@/lib/request-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_RUN_REQUEST_BYTES = 32 * 1024;

export async function POST(request: Request) {
  const guardResponse = guardMutationRequest(request);
  if (guardResponse) {
    return guardResponse;
  }

  try {
    const declaredLength = Number(request.headers.get("content-length") ?? 0);
    if (Number.isFinite(declaredLength) && declaredLength > MAX_RUN_REQUEST_BYTES) {
      return jsonNoStore({ error: "Run request is too large." }, { status: 413 });
    }

    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_RUN_REQUEST_BYTES) {
      return jsonNoStore({ error: "Run request is too large." }, { status: 413 });
    }

    const { type, values } = parseRunStartPayload(JSON.parse(rawBody) as unknown);
    const configStatus = await readEngineConfigStatus();
    const blockers = getBlockingRunChecks(type, configStatus.checks, values);
    if (blockers.length > 0) {
      return jsonNoStore(
        {
          error: "Required engine checks are not ready for this run.",
          blockers,
        },
        { status: 422 },
      );
    }

    const args = buildRunArgs(type, values);
    const run = startEngineRun(args);
    const state = getRunRegistryState();
    return jsonNoStore({ run, ...state });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start run.";
    const status = error instanceof RunRequestValidationError
      ? 400
      : error instanceof RunCapacityError || error instanceof RunResourceConflictError
        ? 409
        : error instanceof SyntaxError
          ? 400
          : 500;

    return jsonNoStore(
      {
        error: message,
        code: error instanceof RunCapacityError || error instanceof RunResourceConflictError
          ? error.code
          : undefined,
        maxActive: error instanceof RunCapacityError ? error.maxActive : undefined,
        conflicts: error instanceof RunResourceConflictError ? error.resources : undefined,
      },
      { status },
    );
  }
}
