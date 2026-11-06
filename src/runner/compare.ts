import type { Comparison } from "@/problems/schema";

const DEFAULT_FLOAT_ABS = 1e-6;

/** Canonical string with sorted object keys, used for multiset comparison. */
export function canonical(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    return `{${Object.keys(o)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${canonical(o[k])}`)
      .join(",")}}`;
  }
  if (typeof v === "number") return Object.is(v, -0) ? "0" : String(v);
  if (v === undefined) return "undefined";
  return JSON.stringify(v);
}

export function deepEqual(a: unknown, b: unknown): boolean {
  if (typeof a === "number" && typeof b === "number") return a === b || (Number.isNaN(a) && Number.isNaN(b));
  if (a === b) return true;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (!deepEqual(a[i], b[i])) return false;
    return true;
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    const ka = Object.keys(a as object);
    const kb = Object.keys(b as object);
    if (ka.length !== kb.length) return false;
    for (const k of ka) {
      if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
      if (!deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k])) return false;
    }
    return true;
  }
  return false;
}

function floatEqual(a: unknown, b: unknown, abs: number, rel: number): boolean {
  if (typeof a === "number" && typeof b === "number") {
    if (a === b) return true;
    if (!Number.isFinite(a) || !Number.isFinite(b)) return Number.isNaN(a) && Number.isNaN(b);
    const d = Math.abs(a - b);
    return d <= abs || d <= rel * Math.max(Math.abs(a), Math.abs(b));
  }
  if (Array.isArray(a) && Array.isArray(b)) {
    return a.length === b.length && a.every((x, i) => floatEqual(x, b[i], abs, rel));
  }
  if (a && b && typeof a === "object" && typeof b === "object" && !Array.isArray(a) && !Array.isArray(b)) {
    const ka = Object.keys(a);
    return ka.length === Object.keys(b).length && ka.every((k) => k in b && floatEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k], abs, rel));
  }
  return deepEqual(a, b);
}

/** Compares an actual result against the expected value using the problem's comparison mode. */
export function compareResults(actual: unknown, expected: unknown, mode: Comparison): boolean {
  if (mode === "exact") return deepEqual(actual, expected);
  if (mode === "unordered") {
    if (!Array.isArray(actual) || !Array.isArray(expected) || actual.length !== expected.length) return false;
    const a = actual.map(canonical).sort();
    const b = expected.map(canonical).sort();
    return a.every((x, i) => x === b[i]);
  }
  const { abs, rel } = mode.float;
  return floatEqual(actual, expected, abs ?? (rel === undefined ? DEFAULT_FLOAT_ABS : 0), rel ?? 0);
}
