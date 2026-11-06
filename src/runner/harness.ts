/**
 * The JavaScript test harness. Pure logic: it runs in the worker in the
 * browser and directly in Node for the unit tests (no globals needed;
 * `console` is injected into the user's code as a parameter).
 */
import { compareResults } from "./compare";
import { capStdout, formatValue } from "./format";
import type { RunTest, TestResult } from "./protocol";
import type { Comparison } from "@/problems/schema";

export interface HarnessOptions {
  code: string;
  functionName: string;
  tests: readonly RunTest[];
  comparison: Comparison;
  timeLimitMs: number;
  onStart?: (testId: string) => void;
  onResult?: (result: TestResult) => void;
  now?: () => number;
}

export type CompileOutcome =
  | { ok: true; fn: (...args: unknown[]) => unknown; logs: string[] }
  | { ok: false; kind: "syntax" | "missing_function"; message: string; line?: number };

/** Lines added in front of the user's code by the wrapper below. */
const HEADER_LINES = 3;

export function compileUserFunction(code: string, functionName: string): CompileOutcome {
  const logs: string[] = [];
  const fakeConsole = makeConsole(logs);
  try {
    const factory = new Function(
      "console",
      `"use strict";\n${code}\n;return typeof ${functionName} === "function" ? ${functionName} : undefined;`,
    );
    const fn = factory(fakeConsole) as ((...args: unknown[]) => unknown) | undefined;
    if (!fn) {
      return {
        ok: false,
        kind: "missing_function",
        message: `Define a function named ${functionName}.`,
      };
    }
    // Rebind the console to a fresh buffer per test via the closure below.
    return { ok: true, fn, logs };
  } catch (e) {
    const err = e as Error;
    return {
      ok: false,
      kind: "syntax",
      message: `${err.name}: ${err.message}`,
      line: lineFromStack(err),
    };
  }
}

function makeConsole(buffer: string[]): Console {
  const push = (...args: unknown[]) => {
    buffer.push(args.map((a) => (typeof a === "string" ? a : safeInspect(a))).join(" "));
  };
  return { log: push, info: push, debug: push, warn: push, error: push, table: push } as unknown as Console;
}

function safeInspect(v: unknown): string {
  try {
    return typeof v === "object" ? JSON.stringify(v) : String(v);
  } catch {
    return String(v);
  }
}

function lineFromStack(err: Error): number | undefined {
  const m = /<anonymous>:(\d+):\d+/.exec(err.stack ?? "");
  if (!m) return undefined;
  const line = Number(m[1]) - HEADER_LINES;
  return line > 0 ? line : undefined;
}

/** What invoking the user's function once produced, independent of language. */
export type Invocation =
  | { kind: "value"; value: unknown; runtimeMs: number; stdout: string }
  | { kind: "error"; name: string; message: string; line?: number; runtimeMs: number; stdout: string };

export type Invoker = (args: unknown[]) => Promise<Invocation>;

export interface RunWithOptions {
  tests: readonly RunTest[];
  comparison: Comparison;
  timeLimitMs: number;
  invoke: Invoker;
  onStart?: (testId: string) => void;
  onResult?: (result: TestResult) => void;
}

/**
 * The language-independent test loop: invoke, judge (pass / fail / error /
 * timeout), stream. A test is a TIMEOUT when its runtime exceeds the limit even
 * if the answer was right ("brute force on large inputs fails"). Infinite loops
 * cannot be caught here; the main thread's watchdog terminates the worker.
 */
export function judge(test: RunTest, inv: Invocation, comparison: Comparison, timeLimitMs: number): TestResult {
  const base = { testId: test.id, category: test.category, expected: formatValue(test.expected), runtimeMs: inv.runtimeMs, stdout: capStdout(inv.stdout) };
  if (inv.kind === "error") {
    return { ...base, status: "error", error: { name: inv.name, message: inv.message, line: inv.line } };
  }
  if (inv.runtimeMs > timeLimitMs) {
    return {
      ...base,
      status: "timeout",
      error: { name: "TimeLimitExceeded", message: `Time limit exceeded: ${Math.round(inv.runtimeMs)} ms (limit ${timeLimitMs} ms)` },
    };
  }
  if (compareResults(normalize(inv.value), test.expected, comparison)) return { ...base, status: "pass" };
  return { ...base, status: "fail", actual: formatValue(inv.value) };
}

export async function runTestsWith(opts: RunWithOptions): Promise<TestResult[]> {
  const results: TestResult[] = [];
  for (const test of opts.tests) {
    opts.onStart?.(test.id);
    const inv = await opts.invoke(structuredClone(test.args));
    const result = judge(test, inv, opts.comparison, opts.timeLimitMs);
    results.push(result);
    opts.onResult?.(result);
  }
  return results;
}

/** JavaScript: compile the user's code and run the shared loop. */
export async function runJsHarness(opts: HarnessOptions): Promise<{ results: TestResult[]; fatal?: Extract<CompileOutcome, { ok: false }> }> {
  const now = opts.now ?? (() => performance.now());
  const compiled = compileUserFunction(opts.code, opts.functionName);
  if (!compiled.ok) return { results: [], fatal: compiled };
  const { fn, logs } = compiled;

  const invoke: Invoker = async (args) => {
    logs.length = 0;
    const started = now();
    try {
      let value = fn(...args);
      if (value && typeof (value as Promise<unknown>).then === "function") value = await value;
      return { kind: "value", value, runtimeMs: now() - started, stdout: logs.join("\n") };
    } catch (e) {
      const err = e as Error;
      return {
        kind: "error",
        name: err?.name ?? "Error",
        message: String(err?.message ?? err),
        line: err instanceof Error ? lineFromStack(err) : undefined,
        runtimeMs: now() - started,
        stdout: logs.join("\n"),
      };
    }
  };
  const results = await runTestsWith({ ...opts, invoke });
  return { results };
}

/** Make typed arrays and similar look like their JSON selves before comparing. */
function normalize(v: unknown): unknown {
  if (ArrayBuffer.isView(v) && !(v instanceof DataView)) return Array.from(v as unknown as ArrayLike<number>);
  return v;
}
