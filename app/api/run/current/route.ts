import { getCurrentRun, getRunRegistryState } from "@/lib/engine-runner";
import { readLatestJobOutcomes } from "@/lib/run-progress";
import { jsonNoStore } from "@/lib/request-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return jsonNoStore({
    run: getCurrentRun(),
    ...getRunRegistryState(),
    latestOutcomes: readLatestJobOutcomes(),
  });
}
