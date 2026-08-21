import { subscribeToRun, type EngineRunEvent } from "@/lib/engine-runner";
import { NO_STORE_HEADERS } from "@/lib/request-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function encodeEvent(event: EngineRunEvent) {
  return `event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const encoder = new TextEncoder();
  let unsubscribe: (() => void) | null = null;
  let keepAlive: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(
        encoder.encode(`event: connected\ndata: ${JSON.stringify({ runId: id })}\n\n`),
      );

      unsubscribe = subscribeToRun(id, (event) => {
        controller.enqueue(encoder.encode(encodeEvent(event)));
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
