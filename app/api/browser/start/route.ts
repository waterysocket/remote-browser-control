import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { startBrowserContainer, waitForBrowserReady } from "@/lib/docker";
import { saveSession } from "@/lib/sessionStore";
import { connectSession } from "@/lib/playwrightManager";

export async function POST() {
  const sessionId = randomUUID();

  try {
    // 1. Start Docker container
    const { containerId, port } = await startBrowserContainer();

    // 2. Save session
    saveSession(sessionId, { containerId, port });

    // 3. Poll until Chromium inside the container is actually ready
    //    (replaces the unreliable fixed 2-second sleep)
    await waitForBrowserReady(port);

    // 4. Connect Playwright over CDP
    await connectSession(sessionId, port);

    console.log(
      `[session:start] ready sessionId=${sessionId} containerId=${containerId.slice(0, 12)} port=${port}`
    );

    return NextResponse.json(
      {
        sessionId,
        containerId: containerId.slice(0, 12),
        port,
        startedAt: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[session:start] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
