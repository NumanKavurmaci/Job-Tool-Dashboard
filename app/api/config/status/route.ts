import { NextResponse } from "next/server";
import { readEngineConfigStatus } from "@/lib/engine-status";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(await readEngineConfigStatus());
}
