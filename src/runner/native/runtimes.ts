/** Server only. Finds the JDK, C compiler and Go toolchain on the machine running voxelcode. */
import { spawn } from "node:child_process";
import type { NativeLanguage } from "@/problems/languages";

export interface RuntimeInfo {
  available: boolean;
  version?: string;
  /** Resolved compiler command (C only: cc, clang or gcc). */
  command?: string;
  hint: string;
}

export interface ExecResult {
  code: number | null;
  signal: string | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

export function exec(cmd: string, args: string[], opts: { cwd?: string; timeoutMs?: number; env?: Record<string, string | undefined> } = {}): Promise<ExecResult> {
  return new Promise((resolve) => {
    let stdout = "";
    let stderr = "";
    let timedOut = false;
    let child;
    try {
      child = spawn(cmd, args, { cwd: opts.cwd, env: (opts.env ?? process.env) as NodeJS.ProcessEnv, stdio: ["ignore", "pipe", "pipe"] });
    } catch {
      resolve({ code: -1, signal: null, stdout, stderr: `could not start ${cmd}`, timedOut });
      return;
    }
    const timer = opts.timeoutMs
      ? setTimeout(() => {
          timedOut = true;
          child.kill("SIGKILL");
        }, opts.timeoutMs)
      : undefined;
    child.stdout.on("data", (d: Buffer) => {
      if (stdout.length < 200_000) stdout += d.toString();
    });
    child.stderr.on("data", (d: Buffer) => {
      if (stderr.length < 200_000) stderr += d.toString();
    });
    child.on("error", (e) => {
      clearTimeout(timer);
      resolve({ code: -1, signal: null, stdout, stderr: stderr || String(e.message), timedOut });
    });
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      resolve({ code, signal, stdout, stderr, timedOut });
    });
  });
}

const HINTS: Record<NativeLanguage, string> = {
  java: "Install a JDK (for example `brew install openjdk`) so `javac` and `java` are on your PATH.",
  c: "Install a C compiler (Xcode command line tools, or gcc/clang).",
  go: "Install Go from https://go.dev/dl/ so `go` is on your PATH.",
};

let cache: { at: number; value: Record<NativeLanguage, RuntimeInfo> } | null = null;

async function probe(): Promise<Record<NativeLanguage, RuntimeInfo>> {
  const [javac, java, go, cc, clang, gcc] = await Promise.all([
    exec("javac", ["-version"], { timeoutMs: 8000 }),
    exec("java", ["-version"], { timeoutMs: 8000 }),
    exec("go", ["version"], { timeoutMs: 8000 }),
    exec("cc", ["--version"], { timeoutMs: 8000 }),
    exec("clang", ["--version"], { timeoutMs: 8000 }),
    exec("gcc", ["--version"], { timeoutMs: 8000 }),
  ]);
  const ok = (r: ExecResult) => r.code === 0;
  const first = (r: ExecResult) => (r.stdout || r.stderr).split("\n")[0]?.trim() ?? "";
  const cCompiler = ok(cc) ? { command: "cc", r: cc } : ok(clang) ? { command: "clang", r: clang } : ok(gcc) ? { command: "gcc", r: gcc } : null;
  return {
    java: { available: ok(javac) && ok(java), version: ok(javac) ? first(javac) : undefined, hint: HINTS.java },
    c: { available: !!cCompiler, version: cCompiler ? first(cCompiler.r) : undefined, command: cCompiler?.command, hint: HINTS.c },
    go: { available: ok(go), version: ok(go) ? first(go) : undefined, hint: HINTS.go },
  };
}

export async function detectRuntimes(force = false): Promise<Record<NativeLanguage, RuntimeInfo>> {
  if (!force && cache && Date.now() - cache.at < 60_000) return cache.value;
  const value = await probe();
  cache = { at: Date.now(), value };
  return value;
}
