import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { startBrowserContainer } from "@/lib/docker";
import { saveSession } from "@/lib/sessionStore";

export async function POST() {
  const sessionId = randomUUID();

  try {
    const { containerId, port } = await startBrowserContainer();

    saveSession(sessionId, { containerId, port });

    console.log(`[session:start] sessionId=${sessionId} containerId=${containerId.slice(0, 12)} port=${port}`);

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
