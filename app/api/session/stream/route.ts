import { NextRequest } from "next/server";
import { takeScreenshot } from "@/lib/playwrightManager";

export const dynamic = "force-dynamic";

const DEFAULT_FPS = 20;

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");
  const fpsParam  = req.nextUrl.searchParams.get("fps");

  if (!sessionId) {
    return new Response("sessionId required", { status: 400 });
  }

  const fps        = Math.min(60, Math.max(1, parseInt(fpsParam ?? String(DEFAULT_FPS), 10) || DEFAULT_FPS));
  const intervalMs = Math.round(1000 / fps);

  const encoder = new TextEncoder();
  let stopped = false;

  const stream = new ReadableStream({
    async start(controller) {
      req.signal.addEventListener("abort", () => {
        stopped = true;
      });

      while (!stopped) {
        const t0 = Date.now();

        try {
          const base64 = await takeScreenshot(sessionId);
          const msg = `data: ${base64}\n\n`;
          controller.enqueue(encoder.encode(msg));
        } catch (err) {
          const errMsg     = err instanceof Error ? err.message : "screenshot failed";
          const expired    = errMsg.includes("timed out") || errMsg.includes("Session not found") || errMsg.includes("closed");
          controller.enqueue(
            encoder.encode(
              `event: error\ndata: ${JSON.stringify({ message: errMsg, sessionExpired: expired })}\n\n`
            )
          );
          stopped = true;
          break;
        }

        const elapsed = Date.now() - t0;
        const wait    = Math.max(0, intervalMs - elapsed);
        if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type":  "text/event-stream",
      "Cache-Control": "no-cache",
      Connection:      "keep-alive",
    },
  });
}
