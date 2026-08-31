import { getRun, getRunEvents, subscribeToRun, type EngineRunEvent } from "@/lib/engine-runner";
import { NO_STORE_HEADERS } from "@/lib/request-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function encodeEvent(event: EngineRunEvent) {
  return `id: ${event.sequence}\nevent: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

function isTerminalEvent(event: EngineRunEvent) {
  return event.type === "run_finished" || event.type === "run_failed" || event.type === "run_stopped";
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const run = getRun(id);
  if (!run) {
    return new Response(JSON.stringify({ error: "Engine run was not found.", code: "RUN_NOT_FOUND" }), {
      status: 404,
      headers: { ...NO_STORE_HEADERS, "Content-Type": "application/json" },
    });
  }

  const lastEventId = Number(request.headers.get("last-event-id") ?? 0);
  const replay = (getRunEvents(id) ?? []).filter((event) =>
    !Number.isFinite(lastEventId) || lastEventId <= 0 || event.sequence > lastEventId,
  );
  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let keepAlive: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ runId: id })}\n\n`),
      );

      for (const event of replay) {
        controller.enqueue(encoder.encode(encodeEvent(event)));
      }

      if (run.status === "completed" || run.status === "failed" || run.status === "stopped") {
        controller.close();
        return;
      }

      unsubscribe = subscribeToRun(id, (event) => {
        controller.enqueue(encoder.encode(encodeEvent(event)));
        if (isTerminalEvent(event)) {
          if (keepAlive) clearInterval(keepAlive);
          unsubscribe?.();
          controller.close();
        }
      });

      keepAlive = setInterval(() => {
        controller.enqueue(encoder.encode(`event: heartbeat\ndata: {}\n\n`));
      }, 15000);
    },
    cancel() {
      if (keepAlive) {
        clearInterval(keepAlive);
      }
      unsubscribe?.();
    },
  });

  return new Response(stream, {
    headers: {
      ...NO_STORE_HEADERS,
      Connection: "keep-alive",
      "Content-Type": "text/event-stream",
      "X-Accel-Buffering": "no",
    },
  });
}
