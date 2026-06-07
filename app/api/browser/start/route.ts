import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { startBrowserContainer } from "@/lib/docker";
import { saveSession } from "@/lib/sessionStore";

export async function POST() {
  const sessionId = randomUUID();

  try {
    // 1. Start Docker container
    const containerId = await startBrowserContainer();

    // 2. Store sessionId <-> containerId
    saveSession(sessionId, containerId);

    console.log(`[session:start] sessionId=${sessionId} containerId=${containerId.slice(0, 12)}`);

    return NextResponse.json(
      {
        sessionId,
        containerId: containerId.slice(0, 12), // short ID for display
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
