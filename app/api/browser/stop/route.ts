import { NextRequest, NextResponse } from "next/server";
import { stopBrowserContainer } from "@/lib/docker";
import { getContainerId, deleteSession } from "@/lib/sessionStore";

export async function POST(req: NextRequest) {
  const { sessionId } = await req.json();

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  const containerId = getContainerId(sessionId);

  if (!containerId) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  try {
    // Stop and remove the Docker container
    await stopBrowserContainer(containerId);

    // Remove from store
    deleteSession(sessionId);

    console.log(`[session:stop] sessionId=${sessionId} containerId=${containerId.slice(0, 12)}`);

    return NextResponse.json({ stopped: true, sessionId }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[session:stop] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
