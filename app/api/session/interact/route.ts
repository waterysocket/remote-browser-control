import { NextRequest, NextResponse } from "next/server";
import { sendClick, sendKey, sendType, sendScroll, navigateTo, goBack, goForward, reloadPage } from "@/lib/playwrightManager";

export async function POST(req: NextRequest) {
  let body: { sessionId: string; type: string; x?: number; y?: number; key?: string; text?: string; deltaY?: number; url?: string };

  try {
    const text = await req.text();
    body = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { sessionId, type, x, y, key, text, deltaY, url } = body;
  if (!sessionId) return NextResponse.json({ error: "sessionId required" }, { status: 400 });

  try {
    if (type === "click" && x !== undefined && y !== undefined) {
      await sendClick(sessionId, x, y);
    } else if (type === "key" && key) {
      await sendKey(sessionId, key);
    } else if (type === "type" && text) {
      await sendType(sessionId, text);
    } else if (type === "scroll" && x !== undefined && y !== undefined && deltaY !== undefined) {
      await sendScroll(sessionId, x, y, deltaY);
    } else if (type === "navigate" && url) {
      await navigateTo(sessionId, url);
    } else if (type === "back") {
      await goBack(sessionId);
    } else if (type === "forward") {
      await goForward(sessionId);
    } else if (type === "reload") {
      await reloadPage(sessionId);
    } else {
      return NextResponse.json({ error: "Unknown or incomplete interaction" }, { status: 400 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
