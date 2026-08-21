import { readEngineConfigStatus } from "@/lib/engine-status";
import { jsonNoStore } from "@/lib/request-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  return jsonNoStore(await readEngineConfigStatus());
}
