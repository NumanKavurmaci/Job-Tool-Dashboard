import { NextResponse } from "next/server";
import { getCurrentRun } from "@/lib/engine-runner";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ run: getCurrentRun() });
}
