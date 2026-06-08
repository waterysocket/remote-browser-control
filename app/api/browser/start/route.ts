import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { startBrowserContainer } from "@/lib/docker";
import { saveSession } from "@/lib/sessionStore";
import { connectSession } from "@/lib/playwrightManager";

export async function POST() {
  const sessionId = randomUUID();

  try {
    // 1. Start Docker container
    const { containerId, port } = await startBrowserContainer();

    // 2. Save session
    saveSession(sessionId, { containerId, port });

    // 3. Wait a moment for Chromium to boot, then connect Playwright
    await new Promise((r) => setTimeout(r, 2000));
    await connectSession(sessionId, port);

    console.log(`[session:start] ready sessionId=${sessionId} containerId=${containerId.slice(0, 12)} port=${port}`);

    return NextResponse.json({ sessionId, containerId: containerId.slice(0, 12), port, startedAt: new Date().toISOString() }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[session:start] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
