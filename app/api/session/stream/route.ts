import { NextRequest } from "next/server";
import { takeScreenshot } from "@/lib/playwrightManager";

export const dynamic = "force-dynamic";

const FPS = 20;
const INTERVAL_MS = 1000 / FPS; // 50ms

export async function GET(req: NextRequest) {
  const sessionId = req.nextUrl.searchParams.get("sessionId");

  if (!sessionId) {
    return new Response("sessionId required", { status: 400 });
  }

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
          const errMsg = err instanceof Error ? err.message : "screenshot failed";
          const expired = errMsg.includes("timed out") || errMsg.includes("Session not found") || errMsg.includes("closed");
          // Send a structured error event so the client can show a useful message
          controller.enqueue(
            encoder.encode(
              `event: error\ndata: ${JSON.stringify({ message: errMsg, sessionExpired: expired })}\n\n`
            )
          );
          stopped = true;
          break;
        }

        const elapsed = Date.now() - t0;
        const wait = Math.max(0, INTERVAL_MS - elapsed);
        if (wait > 0) await new Promise((r) => setTimeout(r, wait));
      }

      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}