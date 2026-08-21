import { getCurrentRun, getRunRegistryState } from "@/lib/engine-runner";
import { jsonNoStore } from "@/lib/request-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return jsonNoStore({ run: getCurrentRun(), ...getRunRegistryState() });
}
