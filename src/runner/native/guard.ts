/**
 * Request guard for the compile server. The endpoint executes code on the
 * machine, so it must only ever serve the app's own pages on this machine:
 *  - the Host must be a loopback name (blocks LAN access and DNS rebinding),
 *  - a browser-supplied Origin / Sec-Fetch-Site must be same-origin (blocks other websites),
 *  - the body must be JSON (a non-"simple" request, so cross-site forms cannot send it).
 */
export interface GuardResult {
  ok: boolean;
  status?: number;
  reason?: string;
}

const LOOPBACK = new Set(["localhost", "127.0.0.1", "[::1]", "::1"]);

export function hostnameOf(hostHeader: string | null): string {
  if (!hostHeader) return "";
  if (hostHeader.startsWith("[")) return hostHeader.slice(0, hostHeader.indexOf("]") + 1).toLowerCase();
  return hostHeader.split(":")[0]!.toLowerCase();
}

export function guardNativeRequest(headers: { get(name: string): string | null }, opts: { requireJson: boolean; env?: Record<string, string | undefined> }): GuardResult {
  const env = opts.env ?? process.env;
  if ((env.VOXELCODE_NATIVE_RUNNER ?? "").toLowerCase() === "off") {
    return { ok: false, status: 403, reason: "The local compile server is disabled (VOXELCODE_NATIVE_RUNNER=off)." };
  }
  const host = headers.get("host");
  if (!LOOPBACK.has(hostnameOf(host))) {
    return { ok: false, status: 403, reason: "The compile server only answers requests addressed to localhost." };
  }
  const site = headers.get("sec-fetch-site");
  if (site && site !== "same-origin" && site !== "none") {
    return { ok: false, status: 403, reason: "Cross-site requests are not allowed." };
  }
  const origin = headers.get("origin");
  if (origin) {
    let originHost = "";
    try {
      originHost = new URL(origin).host.toLowerCase();
    } catch {
      /* malformed */
    }
    if (originHost !== (host ?? "").toLowerCase()) return { ok: false, status: 403, reason: "Cross-origin requests are not allowed." };
  }
  if (opts.requireJson && !(headers.get("content-type") ?? "").toLowerCase().includes("application/json")) {
    return { ok: false, status: 415, reason: "Expected application/json." };
  }
  return { ok: true };
}
