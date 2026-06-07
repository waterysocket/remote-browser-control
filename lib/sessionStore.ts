/**
 * In-memory store: sessionId → containerId
 *
 * This lives in the Node.js process so it persists across requests
 * as long as the dev server is running.
 *
 * For production, swap this out with Redis or a database.
 */

const sessionStore = new Map<string, string>();

export function saveSession(sessionId: string, containerId: string) {
  sessionStore.set(sessionId, containerId);
}

export function getContainerId(sessionId: string): string | undefined {
  return sessionStore.get(sessionId);
}

export function deleteSession(sessionId: string) {
  sessionStore.delete(sessionId);
}
