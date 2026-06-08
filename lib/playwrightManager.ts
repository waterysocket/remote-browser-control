/**
 * Manages Playwright browser connections per session.
 * Stored on globalThis to survive Next.js hot reloads.
 */

import { chromium, Browser, Page } from "playwright-core";
import { BROWSERLESS_TOKEN } from "@/lib/docker";

interface PlaywrightSession {
  browser: Browser;
  page: Page;
  port: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __playwrightSessions: Map<string, PlaywrightSession> | undefined;
}

const sessions: Map<string, PlaywrightSession> =
  globalThis.__playwrightSessions ??
  (globalThis.__playwrightSessions = new Map());

/**
 * Returns true if the error looks like the browser/page was closed remotely
 * (e.g. Browserless session timeout, container restart).
 */
function isSessionDeadError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("Target page, context or browser has been closed") ||
    msg.includes("Browser has been closed") ||
    msg.includes("Connection closed") ||
    msg.includes("WebSocket") ||
    msg.includes("Target closed") ||
    msg.includes("Session closed")
  );
}

/**
 * Evicts a dead session from the map so callers get a clean
 * "session not found" error instead of repeated Playwright crashes.
 */
function evictSession(sessionId: string) {
  if (sessions.has(sessionId)) {
    sessions.delete(sessionId);
    console.warn(`[pw] evicted dead session ${sessionId}`);
  }
}

/**
 * Wraps a Playwright call: if the browser/page has been closed remotely,
 * evicts the session and re-throws with a clear message.
 */
async function withSession<T>(
  sessionId: string,
  fn: (s: PlaywrightSession) => Promise<T>
): Promise<T> {
  const session = sessions.get(sessionId);
  if (!session) {
    throw new Error(`Session not found: ${sessionId}. The browser may have timed out — please start a new session.`);
  }
  try {
    return await fn(session);
  } catch (err) {
    if (isSessionDeadError(err)) {
      evictSession(sessionId);
      throw new Error(`Browser session closed unexpectedly (Browserless timeout?). Please start a new session.`);
    }
    throw err;
  }
}

/**
 * Connects Playwright to the Chromium container running on `port`,
 * opens a blank page, and stores the session.
 */
export async function connectSession(sessionId: string, port: number): Promise<void> {
  if (sessions.has(sessionId)) return; // already connected

  // Browserless v2 exposes its CDP WebSocket at /chromium (not /json/version —
  // that path is HTTP-only and returns 404 when used as a WebSocket endpoint).
  const wsEndpoint = `ws://localhost:${port}/chromium?token=${BROWSERLESS_TOKEN}`;
  console.log(`[pw] connecting to ${wsEndpoint}`);

  const browser = await chromium.connectOverCDP(wsEndpoint);

  // Listen for unexpected disconnection and auto-evict
  browser.on("disconnected", () => {
    console.warn(`[pw] browser disconnected for session ${sessionId} — evicting`);
    evictSession(sessionId);
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
  });
  const page = await context.newPage();
  await page.goto("https://www.google.com");

  sessions.set(sessionId, { browser, page, port });
  console.log(`[pw] connected session ${sessionId}`);
}

/**
 * Takes a screenshot and returns it as a base64 JPEG string.
 */
export async function takeScreenshot(sessionId: string): Promise<string> {
  return withSession(sessionId, async (s) => {
    const buf = await s.page.screenshot({ type: "jpeg", quality: 70 });
    return buf.toString("base64");
  });
}

/**
 * Sends a click at (x, y) on the page.
 */
export async function sendClick(sessionId: string, x: number, y: number): Promise<void> {
  return withSession(sessionId, (s) => s.page.mouse.click(x, y));
}

/**
 * Sends a keyboard key press.
 */
export async function sendKey(sessionId: string, key: string): Promise<void> {
  return withSession(sessionId, (s) => s.page.keyboard.press(key));
}

/**
 * Types text into the currently focused element.
 */
export async function sendType(sessionId: string, text: string): Promise<void> {
  return withSession(sessionId, (s) => s.page.keyboard.type(text));
}

/**
 * Scrolls the page.
 */
export async function sendScroll(sessionId: string, x: number, y: number, deltaY: number): Promise<void> {
  return withSession(sessionId, (s) => s.page.mouse.wheel(0, deltaY));
}

/**
 * Navigates the page to a given URL.
 */
export async function navigateTo(sessionId: string, url: string): Promise<void> {
  return withSession(sessionId, (s) => {
    let nav = url;
    if (!nav.startsWith("http://") && !nav.startsWith("https://")) {
      nav = "https://" + nav;
    }
    return s.page.goto(nav).then(() => undefined);
  });
}

/**
 * Disconnects and cleans up a session.
 */
export async function disconnectSession(sessionId: string): Promise<void> {
  const session = sessions.get(sessionId);
  if (!session) return;
  sessions.delete(sessionId);
  try {
    await session.browser.close();
  } catch {
    // Ignore errors if browser already closed
  }
  console.log(`[pw] disconnected session ${sessionId}`);
}