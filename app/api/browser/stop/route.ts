import { NextRequest, NextResponse } from "next/server";
import { stopBrowserContainer } from "@/lib/docker";
import { getSession, deleteSession } from "@/lib/sessionStore";

export async function POST(req: NextRequest) {
  let sessionId: string | undefined;

  try {
    const text = await req.text();
    if (!text || text.trim() === "") {
      return NextResponse.json({ error: "Empty request body" }, { status: 400 });
    }
    const body = JSON.parse(text);
    sessionId = body.sessionId;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
  }

  const session = getSession(sessionId);

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  try {
    await stopBrowserContainer(session.containerId);
    deleteSession(sessionId);
    console.log(`[session:stop] OK sessionId=${sessionId} containerId=${session.containerId.slice(0, 12)}`);
    return NextResponse.json({ stopped: true, sessionId }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[session:stop] error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
