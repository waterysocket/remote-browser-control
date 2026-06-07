import { NextResponse } from "next/server";
import { randomUUID } from "crypto";

export async function POST() {
  // Generate a unique session ID
  const sessionId = randomUUID();

  // TODO: Replace this with your real browser-launch logic
  // e.g. spawn a Playwright/Puppeteer instance, start a remote browser, etc.

  return NextResponse.json(
    {
      sessionId,
      startedAt: new Date().toISOString(),
    },
    { status: 200 }
  );
}
