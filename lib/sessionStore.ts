/**
 * In-memory store: sessionId → { containerId, port }
 * Attached to globalThis to survive Next.js hot reloads in dev mode.
 */

interface SessionData {
  containerId: string;
  port: number;
}

declare global {
  // eslint-disable-next-line no-var
  var __sessionStore: Map<string, SessionData> | undefined;
}

const sessionStore: Map<string, SessionData> =
  globalThis.__sessionStore ?? (globalThis.__sessionStore = new Map());

export function saveSession(sessionId: string, data: SessionData) {
  console.log(`[store] save  ${sessionId} → container=${data.containerId.slice(0, 12)} port=${data.port}`);
  sessionStore.set(sessionId, data);
}

export function getSession(sessionId: string): SessionData | undefined {
  const data = sessionStore.get(sessionId);
  console.log(`[store] get   ${sessionId} → ${data ? data.containerId.slice(0, 12) : "NOT FOUND"}`);
  return data;
}

export function deleteSession(sessionId: string) {
  console.log(`[store] delete ${sessionId}`);
  sessionStore.delete(sessionId);
}
