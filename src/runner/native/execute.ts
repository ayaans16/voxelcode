/**
 * Server only. Compiles and runs a learner's Java, C or Go solution.
 *
 * Flow: generate a driver from the signature -> compile (once) -> run all tests
 * in one process, reading protocol lines as they stream out. The server owns
 * the time limits: a watchdog starts on every "S <i>" line and kills the
 * process if the test does not finish, then the remaining tests continue in a
 * fresh process. This is NOT a security sandbox: code runs as a normal process
 * of the user running voxelcode (with timeouts, a temp working directory and
 * a minimal environment). See the README.
 */
import { spawn, type ChildProcess } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { NativeLanguage, ValueType } from "@/problems/languages";
import { LANGUAGE_LABELS } from "@/problems/languages";
import type { Comparison } from "@/problems/schema";
import { formatValue } from "../format";
import { judge, type Invocation } from "../harness";
import type { NativeEvent, RunTest, TestResult } from "../protocol";
import { cDriver, goDriver, javaDriver, type DriverSig } from "./drivers";
import { decodeValue, encodeTests, unhex } from "./encoding";
import { detectRuntimes, exec } from "./runtimes";

export interface NativeInput {
  language: NativeLanguage;
  code: string;
  /** The function name the learner must define in this language. */
  functionName: string;
  params: { name: string; type: ValueType }[];
  returns: ValueType;
  tests: readonly RunTest[];
  comparison: Comparison;
  /** Per-test limit in ms. */
  timeLimitMs: number;
  totalTimeoutMs?: number;
}

export type Emit = (event: NativeEvent) => void;

const GRACE_MS = 250;
const COMPILE_TIMEOUT_MS = 90_000;
const MAX_CONCURRENT = 2;

let active = 0;
const waiting: (() => void)[] = [];
async function acquire() {
  if (active >= MAX_CONCURRENT) await new Promise<void>((r) => waiting.push(r));
  active++;
}
function release() {
  active--;
  waiting.shift()?.();
}

/** Joins under a runtime-chosen temp directory (the ignore comment stops the bundler tracing the whole project). */
const at = (dir: string, file: string) => join(/* turbopackIgnore: true */ dir, file);

const FILES: Record<NativeLanguage, { solution: string; driver: string }> = {
  java: { solution: "Solution.java", driver: "Main.java" },
  c: { solution: "solution.c", driver: "driver.c" },
  go: { solution: "solution.go", driver: "driver_main.go" },
};

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Friendly pre-checks so the most common mistakes get a clear message instead of a compiler wall. */
export function precheck(language: NativeLanguage, code: string, fn: string): string | null {
  const name = escapeRe(fn);
  if (language === "java") {
    if (!/\bclass\s+Solution\b/.test(code)) return `Define a class named Solution with a static method named ${fn}.`;
    if (!new RegExp(`\\b${name}\\s*\\(`).test(code)) return `Define a static method named ${fn} inside class Solution.`;
  }
  if (language === "c") {
    if (!new RegExp(`\\b${name}\\s*\\(`).test(code)) return `Define a function named ${fn}.`;
  }
  if (language === "go") {
    if (!/^\s*package\s+main\b/m.test(code)) return "Start your file with: package main";
    if (/^\s*func\s+main\s*\(/m.test(code)) return "Remove your main function: voxelcode supplies one that calls your solution.";
    if (!new RegExp(`^\\s*func\\s+${name}\\s*\\(`, "m").test(code)) return `Define a function named ${fn}.`;
  }
  return null;
}

function driverFor(input: NativeInput): string {
  const sig: DriverSig = { fn: input.functionName, params: input.params, returns: input.returns };
  return input.language === "java" ? javaDriver(sig) : input.language === "c" ? cDriver(sig) : goDriver(sig);
}

function cleanOutput(text: string, dir: string): string {
  return text
    .split(dir)
    .join("")
    .replace(/\/(private\/)?var\/folders\/[^\s:]+\//g, "")
    .replace(/^\.\//gm, "")
    .trim()
    .slice(0, 4000);
}

function lineFrom(text: string, language: NativeLanguage): number | undefined {
  const file = FILES[language].solution.replace(".", "\\.");
  const m = new RegExp(`${file}:(\\d+)`).exec(text);
  return m ? Number(m[1]) : undefined;
}

type Env = Record<string, string | undefined>;

const RUN_ENV = (dir: string): Env => ({
  PATH: process.env.PATH,
  LANG: "en_US.UTF-8",
  TMPDIR: dir,
  HOME: dir,
  GOCACHE: at(dir, ".gocache"),
  GOMEMLIMIT: "600MiB",
});

export async function runNative(input: NativeInput, emit: Emit, signal?: AbortSignal): Promise<void> {
  const started = Date.now();
  const label = LANGUAGE_LABELS[input.language];

  const runtimes = await detectRuntimes();
  const info = runtimes[input.language];
  if (!info.available) {
    emit({ type: "fatal", kind: "unavailable", message: `${label} is not installed on the machine running voxelcode. ${info.hint}` });
    return;
  }
  const missing = precheck(input.language, input.code, input.functionName);
  if (missing) {
    emit({ type: "fatal", kind: input.language === "go" && /main|package/.test(missing) ? "compile" : "missing_function", message: missing });
    return;
  }

  await acquire();
  const dir = await mkdtemp(join(tmpdir(), "voxelcode-"));
  try {
    if (signal?.aborted) return;
    const files = FILES[input.language];
    await writeFile(at(dir, files.solution), input.code, "utf8");
    await writeFile(at(dir, files.driver), driverFor(input), "utf8");

    // ---- compile ----
    emit({ type: "status", status: "compiling" });
    let runCmd: string;
    let runArgs: string[];
    let compile;
    if (input.language === "java") {
      compile = await exec("javac", ["-encoding", "UTF-8", "-nowarn", "-d", "out", files.solution, files.driver], { cwd: dir, timeoutMs: COMPILE_TIMEOUT_MS, env: RUN_ENV(dir) });
      runCmd = "java";
      runArgs = ["-Xmx512m", "-XX:+UseSerialGC", "-Xshare:auto", "-cp", "out", "Main"];
    } else if (input.language === "c") {
      compile = await exec(info.command ?? "cc", ["-O2", "-std=gnu11", "-o", "prog", files.driver, "-lm"], { cwd: dir, timeoutMs: COMPILE_TIMEOUT_MS, env: RUN_ENV(dir) });
      runCmd = at(dir, "prog");
      runArgs = [];
    } else {
      const ver = /go(\d+\.\d+)/.exec(info.version ?? "")?.[1] ?? "1.21";
      await writeFile(at(dir, "go.mod"), `module voxelcode\n\ngo ${ver}\n`, "utf8");
      compile = await exec("go", ["build", "-o", "prog", "."], {
        cwd: dir,
        timeoutMs: COMPILE_TIMEOUT_MS,
        env: { ...process.env, CGO_ENABLED: "0", GOTOOLCHAIN: "local", GOFLAGS: "-mod=mod" } as Env,
      });
      runCmd = at(dir, "prog");
      runArgs = [];
    }
    if (signal?.aborted) return;
    if (compile.code !== 0) {
      const text = compile.timedOut ? "Compilation took too long." : cleanOutput(compile.stderr || compile.stdout, dir);
      emit({ type: "fatal", kind: "compile", message: text || "Compilation failed.", line: lineFrom(text, input.language) });
      return;
    }

    // ---- run (in batches, so a killed test does not lose the rest) ----
    emit({ type: "status", status: "running" });
    const paramTypes = input.params.map((p) => p.type);
    const budget = input.totalTimeoutMs ?? Math.min(120_000, input.tests.length * input.timeLimitMs + 15_000);
    const deadline = Date.now() + budget;
    let remaining = input.tests.slice();

    const results: TestResult[] = [];
    const push = (r: TestResult) => {
      results.push(r);
      emit({ type: "testResult", result: r });
    };
    const stub = (t: RunTest, name: string, message: string, status: TestResult["status"], runtimeMs = 0, stdout = ""): TestResult => ({
      testId: t.id,
      category: t.category,
      status,
      expected: formatValue(t.expected),
      runtimeMs,
      stdout,
      error: { name, message },
    });

    while (remaining.length > 0 && !signal?.aborted) {
      if (Date.now() >= deadline) {
        for (const t of remaining) push(stub(t, "TimeLimitExceeded", "Skipped: total time limit exceeded", "timeout"));
        break;
      }
      const batch = remaining;
      await writeFile(at(dir, "input.txt"), encodeTests(paramTypes, batch), "utf8");
      const out = await runBatch({ cmd: runCmd, args: [...runArgs, "input.txt"], dir, batch, input, deadline, signal, emit: push, onStart: (id) => emit({ type: "testStart", testId: id }) });
      if (out.fatal) {
        emit({ type: "fatal", kind: "internal", message: out.fatal });
        return;
      }
      remaining = batch.slice(out.consumed);
      if (out.consumed === 0) {
        emit({ type: "fatal", kind: "internal", message: "The test runner stopped without running any test." });
        return;
      }
    }
    emit({ type: "done", totalMs: Date.now() - started });
  } finally {
    release();
    await rm(dir, { recursive: true, force: true }).catch(() => undefined);
  }
}

interface BatchArgs {
  cmd: string;
  args: string[];
  dir: string;
  batch: readonly RunTest[];
  input: NativeInput;
  deadline: number;
  signal?: AbortSignal;
  emit: (r: TestResult) => void;
  onStart: (testId: string) => void;
}

function runBatch(a: BatchArgs): Promise<{ consumed: number; fatal?: string }> {
  return new Promise((resolve) => {
    const { batch, input } = a;
    let child: ChildProcess;
    try {
      child = spawn(a.cmd, a.args, { cwd: a.dir, env: RUN_ENV(a.dir) as NodeJS.ProcessEnv, stdio: ["ignore", "pipe", "pipe"] });
    } catch (e) {
      resolve({ consumed: 0, fatal: `Could not start the program: ${(e as Error).message}` });
      return;
    }

    let buffer = "";
    let stderr = "";
    let current: number | null = null;
    let currentStart = 0;
    let finished = 0;
    let fatal: string | undefined;
    let killReason: "timeout" | "deadline" | "abort" | null = null;
    let watchdog: ReturnType<typeof setTimeout> | undefined;

    const kill = (reason: "timeout" | "deadline" | "abort") => {
      killReason = reason;
      child.kill("SIGKILL");
    };
    const onAbort = () => kill("abort");
    a.signal?.addEventListener("abort", onAbort, { once: true });

    const arm = () => {
      clearTimeout(watchdog);
      const left = a.deadline - Date.now();
      const limit = input.timeLimitMs + GRACE_MS;
      watchdog = setTimeout(() => kill(left < limit ? "deadline" : "timeout"), Math.max(1, Math.min(limit, left)));
    };

    const handle = (line: string) => {
      const t = line.split(" ");
      const kind = t[0];
      if (kind === "S") {
        current = Number(t[1]);
        currentStart = Date.now();
        a.onStart(batch[current]!.id);
        arm();
      } else if (kind === "R" || kind === "E") {
        clearTimeout(watchdog);
        const i = Number(t[1]);
        const test = batch[i];
        if (!test) return;
        const runtimeMs = Number(t[2]) / 1e6;
        const stdout = unhex(t[3] ?? "-");
        let inv: Invocation;
        if (kind === "R") {
          try {
            inv = { kind: "value", value: decodeValue(input.returns, t.slice(4)), runtimeMs, stdout };
          } catch (e) {
            inv = { kind: "error", name: "ProtocolError", message: `Could not read your return value: ${(e as Error).message}`, runtimeMs, stdout };
          }
        } else {
          const stack = unhex(t[6] ?? "-");
          const rawMsg = unhex(t[5] ?? "-");
          inv = { kind: "error", name: unhex(t[4] ?? "-"), message: rawMsg === "null" ? "" : rawMsg, line: lineFrom(stack, input.language), runtimeMs, stdout };
        }
        a.emit(judge(test, inv, input.comparison, input.timeLimitMs));
        finished = i + 1;
        current = null;
      } else if (kind === "F") {
        fatal = unhex(t[1] ?? "-");
      }
    };

    child.stdout!.on("data", (d: Buffer) => {
      buffer += d.toString("utf8");
      let nl: number;
      while ((nl = buffer.indexOf("\n")) >= 0) {
        handle(buffer.slice(0, nl));
        buffer = buffer.slice(nl + 1);
      }
      if (buffer.length > 40_000_000) kill("abort");
    });
    child.stderr!.on("data", (d: Buffer) => {
      if (stderr.length < 4000) stderr += d.toString("utf8");
    });

    const finish = (code: number | null, signalName: string | null) => {
      clearTimeout(watchdog);
      a.signal?.removeEventListener("abort", onAbort);
      if (fatal) return resolve({ consumed: finished, fatal });
      if (killReason === "abort") return resolve({ consumed: batch.length });
      if (current !== null) {
        // The process ended (or was killed) in the middle of test `current`.
        const test = batch[current]!;
        const elapsed = Date.now() - currentStart;
        if (killReason === "timeout" || killReason === "deadline") {
          a.emit(stub(test, "TimeLimitExceeded", killReason === "deadline" ? "Total time limit exceeded" : `Time limit exceeded: no answer within ${input.timeLimitMs} ms`, "timeout", elapsed));
        } else {
          const why = signalName ? `signal ${signalName}` : `exit code ${code}`;
          const detail = cleanOutput(stderr, a.dir).slice(0, 700);
          a.emit(stub(test, "ProgramCrashed", `Your program stopped unexpectedly (${why}).${detail ? `\n${detail}` : ""}`, "error", elapsed));
        }
        return resolve({ consumed: current + 1 });
      }
      if (finished < batch.length && code !== 0) {
        return resolve({ consumed: finished, fatal: cleanOutput(stderr, a.dir) || `The test runner exited with code ${code}.` });
      }
      resolve({ consumed: finished });
    };
    child.on("close", finish);
    child.on("error", (e) => {
      fatal = `Could not run the program: ${e.message}`;
    });

    function stub(t: RunTest, name: string, message: string, status: TestResult["status"], runtimeMs: number): TestResult {
      return { testId: t.id, category: t.category, status, expected: formatValue(t.expected), runtimeMs, stdout: "", error: { name, message } };
    }
  });
}
