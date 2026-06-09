import { NextResponse } from "next/server";
import { buildRunArgs, type RunFormValues, type RunScriptType } from "@/lib/run-config";
import { startEngineRun } from "@/lib/engine-runner";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      type?: RunScriptType;
      values?: RunFormValues;
    };

    if (!body.type) {
      return NextResponse.json({ error: "Run type is required." }, { status: 400 });
    }

    const args = buildRunArgs(body.type, body.values ?? {});
    const run = startEngineRun(args);
    return NextResponse.json({ run });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to start run." },
      { status: 400 },
    );
  }
}
