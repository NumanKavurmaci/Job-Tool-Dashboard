import {
  getCurrentRun,
  getRunRegistryState,
  RunIdRequiredError,
  RunNotFoundError,
  stopCurrentRun,
} from "@/lib/engine-runner";
import { guardMutationRequest, jsonNoStore } from "@/lib/request-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const guardResponse = guardMutationRequest(request);
  if (guardResponse) {
    return guardResponse;
  }

  try {
    const body = await request.text();
    const parsed = body ? JSON.parse(body) as { runId?: unknown } : {};
    const runId = typeof parsed.runId === "string" && parsed.runId.trim() ? parsed.runId.trim() : undefined;
    stopCurrentRun(runId);
    return jsonNoStore({ run: getCurrentRun(), ...getRunRegistryState() });
  } catch (error) {
    const status = error instanceof RunNotFoundError ? 404 : error instanceof RunIdRequiredError ? 409 : 400;
    return jsonNoStore({
      error: error instanceof Error ? error.message : "Failed to stop run.",
      code: error instanceof RunNotFoundError || error instanceof RunIdRequiredError ? error.code : undefined,
    }, { status });
  }
}
