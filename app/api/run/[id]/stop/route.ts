import { getRun, RunNotFoundError, stopEngineRun } from "@/lib/engine-runner";
import { guardMutationRequest, jsonNoStore } from "@/lib/request-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const guardResponse = guardMutationRequest(request);
  if (guardResponse) return guardResponse;

  const { id } = await context.params;
  try {
    stopEngineRun(id);
    return jsonNoStore({ run: getRun(id) });
  } catch (error) {
    const status = error instanceof RunNotFoundError ? 404 : 500;
    return jsonNoStore({
      error: error instanceof Error ? error.message : "Failed to stop run.",
      code: error instanceof RunNotFoundError ? error.code : undefined,
    }, { status });
  }
}
