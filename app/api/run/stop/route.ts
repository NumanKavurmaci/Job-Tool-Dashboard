import { NextResponse } from "next/server";
import { getCurrentRun, stopCurrentRun } from "@/lib/engine-runner";

export const dynamic = "force-dynamic";

export async function POST() {
  stopCurrentRun();
  return NextResponse.json({ run: getCurrentRun() });
}
