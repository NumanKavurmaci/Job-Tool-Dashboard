import { getCurrentRun, stopCurrentRun } from "@/lib/engine-runner";
import { guardMutationRequest, jsonNoStore } from "@/lib/request-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const guardResponse = guardMutationRequest(request);
  if (guardResponse) {
    return guardResponse;
  }

  stopCurrentRun();
  return jsonNoStore({ run: getCurrentRun() });
}
