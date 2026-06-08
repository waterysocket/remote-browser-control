/**
 * Manages Playwright browser connections per session.
 * Stored on globalThis to survive Next.js hot reloads.
 */

import { chromium, Browser, Page } from "playwright-core";

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
 * Connects Playwright to the Chromium container running on `port`,
 * opens a blank page, and stores the session.
 */
export async function connectSession(sessionId: string, port: number): Promise<void> {
  if (sessions.has(sessionId)) return; // already connected

  // Browserless exposes a CDP WebSocket endpoint at /chromium/cdp
  const wsEndpoint = `ws://localhost:${port}/json/version`;
  console.log(`[pw] connecting to ${wsEndpoint}`);

  const browser = await chromium.connectOverCDP(wsEndpoint);
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
  const session = sessions.get(sessionId);
  if (!session) throw new Error(`No playwright session for ${sessionId}`);

  const buf = await session.page.screenshot({ type: "jpeg", quality: 70 });
  return buf.toString("base64");
}

/**
 * Sends a click at (x, y) on the page.
 * Coordinates are relative to the 1280x800 viewport.
 */
export async function sendClick(sessionId: string, x: number, y: number): Promise<void> {
  const session = sessions.get(sessionId);
  if (!session) throw new Error(`No playwright session for ${sessionId}`);
  await session.page.mouse.click(x, y);
}

/**
 * Sends a keyboard key press.
 */
export async function sendKey(sessionId: string, key: string): Promise<void> {
  const session = sessions.get(sessionId);
  if (!session) throw new Error(`No playwright session for ${sessionId}`);
  await session.page.keyboard.press(key);
}

/**
 * Types text into the currently focused element.
 */
export async function sendType(sessionId: string, text: string): Promise<void> {
  const session = sessions.get(sessionId);
  if (!session) throw new Error(`No playwright session for ${sessionId}`);
  await session.page.keyboard.type(text);
}

/**
 * Scrolls the page at position (x, y).
 */
export async function sendScroll(sessionId: string, x: number, y: number, deltaY: number): Promise<void> {
  const session = sessions.get(sessionId);
  if (!session) throw new Error(`No playwright session for ${sessionId}`);
  await session.page.mouse.wheel(0, deltaY);
}

/**
 * Disconnects and cleans up a session.
 */
export async function disconnectSession(sessionId: string): Promise<void> {
  const session = sessions.get(sessionId);
  if (!session) return;
  await session.browser.close();
  sessions.delete(sessionId);
  console.log(`[pw] disconnected session ${sessionId}`);
}

/**
 * Navigates the page to a given URL.
 */
export async function navigateTo(sessionId: string, url: string): Promise<void> {
  const session = sessions.get(sessionId);
  if (!session) throw new Error(`No playwright session for ${sessionId}`);
  let nav = url;
  if (!nav.startsWith("http://") && !nav.startsWith("https://")) {
    nav = "https://" + nav;
  }
  await session.page.goto(nav);
}
