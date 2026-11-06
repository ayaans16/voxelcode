/**
 * Main-thread side of the runner. Owns the worker lifecycle and the HARD
 * timeouts: if a test does not finish within its limit the worker is
 * terminated (infinite loops cannot be interrupted any other way), the test is
 * reported as "Time limit exceeded", and the remaining tests continue in a
 * fresh worker.
 */
import { fromWorkerSchema, type RunTest, type TestResult, type ToWorker } from "./protocol";
import type { Comparison } from "@/problems/schema";
import { isNativeLanguage, type Language, type WorkerLanguage } from "@/problems/languages";
import { runOnCompileServer } from "./native/client";
import { formatValue } from "./format";

export interface RunRequest {
  language: Language;
  code: string;
  functionName: string;
  tests: readonly RunTest[];
  comparison: Comparison;
  /** Per-test limit in ms for this language. */
  timeLimitMs: number;
  /** Budget for the whole run (default: derived from the number of tests). */
  totalTimeoutMs?: number;
  /** Java, C and Go run on the local compile server, which looks the tests up by slug. */
  native?: { slug: string; which: "visible" | "hidden" };
}

export type RunOutcome =
  | { kind: "results"; results: TestResult[]; totalMs: number }
  | { kind: "fatal"; error: "syntax" | "missing_function" | "internal" | "compile" | "unavailable"; message: string; line?: number; results: TestResult[] };

export interface RunHooks {
  onStart?: (testId: string) => void;
  onResult?: (result: TestResult) => void;
  onStatus?: (status: "loading" | "compiling" | "running") => void;
}

/** Extra wall-clock slack on top of a test's limit before we kill the worker. */
const WATCHDOG_GRACE_MS = 150;
/** How long a worker gets to become ready (Pyodide needs a while on first load). */
const READY_TIMEOUT_MS = 60_000;

export type WorkerFactory = (language: WorkerLanguage) => Worker;

/**
 * Workers are bundled by scripts/build-workers.mjs into /public/workers as ES-module workers
 * (Pyodide will not run in the "classic" workers the app bundler would emit).
 */
export const defaultWorkerFactory: WorkerFactory = (language) =>
  new Worker(language === "javascript" ? "/workers/js.worker.js" : "/workers/py.worker.js", { type: "module" });

export class RunnerClient {
  private workers: Partial<Record<WorkerLanguage, Worker>> = {};
  private ready: Partial<Record<WorkerLanguage, Promise<Worker>>> = {};
  private nativeAbort: AbortController | null = null;
  private runCounter = 0;
  private cancelCurrent: (() => void) | null = null;

  constructor(private readonly factory: WorkerFactory = defaultWorkerFactory) {}

  /** Start loading a runtime in the background (Pyodide is heavy). */
  warmup(language: WorkerLanguage): Promise<void> {
    return this.getWorker(language).then(
      () => undefined,
      () => undefined,
    );
  }

  private getWorker(language: WorkerLanguage): Promise<Worker> {
    const existing = this.ready[language];
    if (existing) return existing;
    const worker = this.factory(language);
    this.workers[language] = worker;
    const promise = new Promise<Worker>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error("The runtime took too long to load."));
        this.kill(language);
      }, READY_TIMEOUT_MS);
      const onMessage = (e: MessageEvent) => {
        const parsed = fromWorkerSchema.safeParse(e.data);
        if (parsed.success && parsed.data.type === "ready") {
          clearTimeout(timer);
          worker.removeEventListener("message", onMessage);
          resolve(worker);
        } else if (parsed.success && parsed.data.type === "fatal") {
          clearTimeout(timer);
          reject(new Error(parsed.data.message));
          this.kill(language);
        }
      };
      worker.addEventListener("message", onMessage);
      worker.addEventListener("error", (e) => {
        clearTimeout(timer);
        reject(new Error(e.message || "The runtime failed to start."));
        this.kill(language);
      });
      worker.postMessage({ type: "init" } satisfies ToWorker);
    });
    promise.catch(() => undefined);
    this.ready[language] = promise;
    return promise;
  }

  private kill(language: WorkerLanguage): void {
    this.workers[language]?.terminate();
    delete this.workers[language];
    delete this.ready[language];
  }

  /** Abort the run in progress (e.g. the user pressed Run again). */
  cancel(): void {
    this.cancelCurrent?.();
    this.nativeAbort?.abort();
  }

  dispose(): void {
    this.cancel();
    (Object.keys(this.workers) as WorkerLanguage[]).forEach((l) => this.kill(l));
  }

  async run(req: RunRequest, hooks: RunHooks = {}): Promise<RunOutcome> {
    this.cancel();
    if (isNativeLanguage(req.language)) {
      if (!req.native) return { kind: "fatal", error: "internal", message: "Missing problem information for the compile server.", results: [] };
      const abort = new AbortController();
      this.nativeAbort = abort;
      try {
        return await runOnCompileServer({ language: req.language, ...req.native, code: req.code }, hooks, abort.signal);
      } finally {
        if (this.nativeAbort === abort) this.nativeAbort = null;
      }
    }
    const language = req.language as WorkerLanguage;
    const started = performance.now();
    const budget = req.totalTimeoutMs ?? Math.min(60_000, req.tests.length * req.timeLimitMs + 5_000);
    const deadline = started + budget;
    const results: TestResult[] = [];
    let remaining = req.tests.slice();
    let cancelled = false;
    this.cancelCurrent = () => {
      cancelled = true;
      this.kill(language);
    };

    try {
      while (remaining.length > 0 && !cancelled) {
        hooks.onStatus?.("loading");
        let worker: Worker;
        try {
          worker = await this.getWorker(language);
        } catch (e) {
          return { kind: "fatal", error: "internal", message: (e as Error).message, results };
        }
        if (cancelled) break;
        hooks.onStatus?.("running");
        const batch = await this.runBatch(worker, req, remaining, deadline, hooks);
        results.push(...batch.results);
        if (batch.fatal) return { kind: "fatal", ...batch.fatal, results };
        if (batch.killed) {
          this.kill(language);
          const idx = remaining.findIndex((t) => t.id === batch.killed!.testId);
          const killedTest = remaining[idx]!;
          const tle = batch.killed.deadline
            ? "Total time limit exceeded"
            : `Time limit exceeded: no answer within ${req.timeLimitMs} ms`;
          const result: TestResult = {
            testId: killedTest.id,
            category: killedTest.category,
            status: "timeout",
            expected: formatValue(killedTest.expected),
            runtimeMs: batch.killed.elapsed,
            stdout: "",
            error: { name: "TimeLimitExceeded", message: tle },
          };
          results.push(result);
          hooks.onResult?.(result);
          remaining = remaining.slice(idx + 1);
          if (batch.killed.deadline) {
            for (const t of remaining) {
              const skipped: TestResult = {
                testId: t.id,
                category: t.category,
                status: "timeout",
                expected: formatValue(t.expected),
                runtimeMs: 0,
                stdout: "",
                error: { name: "TimeLimitExceeded", message: "Skipped: total time limit exceeded" },
              };
              results.push(skipped);
              hooks.onResult?.(skipped);
            }
            remaining = [];
          }
        } else {
          remaining = [];
        }
      }
      return { kind: "results", results, totalMs: performance.now() - started };
    } finally {
      this.cancelCurrent = null;
    }
  }

  private runBatch(
    worker: Worker,
    req: RunRequest,
    tests: readonly RunTest[],
    deadline: number,
    hooks: RunHooks,
  ): Promise<{
    results: TestResult[];
    killed?: { testId: string; elapsed: number; deadline: boolean };
    fatal?: { error: "syntax" | "missing_function" | "internal"; message: string; line?: number };
  }> {
    const runId = `run-${++this.runCounter}`;
    return new Promise((resolve) => {
      const results: TestResult[] = [];
      let watchdog: ReturnType<typeof setTimeout> | undefined;
      let currentTest: { id: string; at: number } | null = null;
      let settled = false;

      const finish = (value: Parameters<typeof resolve>[0]) => {
        if (settled) return;
        settled = true;
        clearTimeout(watchdog);
        worker.removeEventListener("message", onMessage);
        worker.removeEventListener("error", onError);
        resolve(value);
      };

      const arm = (testId: string) => {
        clearTimeout(watchdog);
        const remainingBudget = deadline - performance.now();
        const limit = req.timeLimitMs + WATCHDOG_GRACE_MS;
        const hitDeadline = remainingBudget < limit;
        watchdog = setTimeout(() => {
          const elapsed = performance.now() - (currentTest?.at ?? performance.now());
          worker.terminate();
          finish({ results, killed: { testId, elapsed, deadline: hitDeadline } });
        }, Math.max(1, Math.min(limit, remainingBudget)));
      };

      const onMessage = (e: MessageEvent) => {
        const parsed = fromWorkerSchema.safeParse(e.data);
        if (!parsed.success) return;
        const m = parsed.data;
        if ("runId" in m && m.runId !== undefined && m.runId !== runId) return;
        switch (m.type) {
          case "testStart":
            currentTest = { id: m.testId, at: performance.now() };
            hooks.onStart?.(m.testId);
            arm(m.testId);
            break;
          case "testResult":
            clearTimeout(watchdog);
            currentTest = null;
            results.push(m.result);
            hooks.onResult?.(m.result);
            break;
          case "done":
            finish({ results });
            break;
          case "fatal":
            finish({ results, fatal: { error: m.kind, message: m.message, line: m.line } });
            break;
          default:
            break;
        }
      };
      const onError = (e: ErrorEvent) => {
        finish({ results, fatal: { error: "internal", message: e.message || "The runner crashed." } });
      };
      worker.addEventListener("message", onMessage);
      worker.addEventListener("error", onError);
      worker.postMessage({
        type: "run",
        runId,
        language: req.language as WorkerLanguage,
        code: req.code,
        functionName: req.functionName,
        tests: tests.map((t) => ({ id: t.id, category: t.category, args: t.args, expected: t.expected })),
        comparison: req.comparison,
        timeLimitMs: req.timeLimitMs,
      } satisfies ToWorker);
    });
  }
}
