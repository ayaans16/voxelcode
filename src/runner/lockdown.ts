/**
 * Removes every network and storage door from a worker's global scope before
 * user code runs. Defense in depth: the page's CSP also sets connect-src 'self'.
 * (Workers already have no DOM.) Anything that cannot be deleted is shadowed.
 */
const BLOCKED = [
  "fetch",
  "XMLHttpRequest",
  "WebSocket",
  "EventSource",
  "WebTransport",
  "importScripts",
  "indexedDB",
  "caches",
  "BroadcastChannel",
  "Worker",
  "SharedWorker",
  "RTCPeerConnection",
  "navigator",
] as const;

export function lockdownWorkerGlobals(
  scope: Record<string, unknown> = globalThis as unknown as Record<string, unknown>,
  keep: readonly string[] = [],
): string[] {
  const blocked: string[] = [];
  for (const name of BLOCKED) {
    if (keep.includes(name) || !(name in scope)) continue;
    try {
      Object.defineProperty(scope, name, {
        value: undefined,
        writable: false,
        configurable: false,
      });
      blocked.push(name);
    } catch {
      try {
        scope[name] = undefined;
        blocked.push(name);
      } catch {
        /* cannot block this one */
      }
    }
  }
  return blocked;
}
