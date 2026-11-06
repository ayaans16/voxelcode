const MAX_CHARS = 4000;
const MAX_ITEMS = 60;

/** Pretty text for a value, abridged so huge arrays do not flood the UI or the message channel. */
export function formatValue(v: unknown): string {
  if (v === undefined) return "undefined";
  const abridged = abridge(v, 0);
  let s: string;
  try {
    s = JSON.stringify(abridged, null, 1) ?? String(v);
  } catch {
    s = String(v);
  }
  return s.length > MAX_CHARS ? `${s.slice(0, MAX_CHARS)}\n... (${s.length - MAX_CHARS} more characters)` : s;
}

function abridge(v: unknown, depth: number): unknown {
  if (typeof v === "number" && !Number.isFinite(v)) return String(v);
  if (typeof v === "bigint") return `${v}n`;
  if (Array.isArray(v)) {
    if (depth > 6) return "[...]";
    const head = v.slice(0, MAX_ITEMS).map((x) => abridge(x, depth + 1));
    return v.length > MAX_ITEMS ? [...head, `... (${v.length - MAX_ITEMS} more items)`] : head;
  }
  if (v && typeof v === "object") {
    if (depth > 6) return "{...}";
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v as Record<string, unknown>).slice(0, MAX_ITEMS)) out[k] = abridge(x, depth + 1);
    return out;
  }
  return v;
}

/** Cap captured stdout so print-spam cannot blow up memory. */
export const MAX_STDOUT = 20_000;
export function capStdout(s: string): string {
  return s.length > MAX_STDOUT ? `${s.slice(0, MAX_STDOUT)}\n... (output truncated)` : s;
}
