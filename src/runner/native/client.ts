/** Browser side of the local compile server: POST the code, read the NDJSON event stream. */
import type { NativeLanguage } from "@/problems/languages";
import { nativeEventSchema, type TestResult } from "../protocol";
import type { RunHooks, RunOutcome } from "../RunnerClient";

export async function runOnCompileServer(
  body: { language: NativeLanguage; slug: string; which: "visible" | "hidden"; code: string },
  hooks: RunHooks,
  signal: AbortSignal,
): Promise<RunOutcome> {
  const started = performance.now();
  const results: TestResult[] = [];
  hooks.onStatus?.("compiling");
  let res: Response;
  try {
    res = await fetch("/api/run", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal });
  } catch (e) {
    if (signal.aborted) return { kind: "results", results, totalMs: 0 };
    return { kind: "fatal", error: "unavailable", message: `Could not reach the local compile server: ${(e as Error).message}`, results };
  }
  if (!res.ok || !res.body) {
    const msg = await res.json().then((j: { error?: string }) => j.error).catch(() => undefined);
    return { kind: "fatal", error: "unavailable", message: msg ?? `The compile server answered ${res.status}.`, results };
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let nl: number;
      while ((nl = buffer.indexOf("\n")) >= 0) {
        const line = buffer.slice(0, nl).trim();
        buffer = buffer.slice(nl + 1);
        if (!line) continue;
        let json: unknown;
        try {
          json = JSON.parse(line);
        } catch {
          continue;
        }
        const parsed = nativeEventSchema.safeParse(json);
        if (!parsed.success) continue;
        const ev = parsed.data;
        if (ev.type === "status") hooks.onStatus?.(ev.status);
        else if (ev.type === "testStart") hooks.onStart?.(ev.testId);
        else if (ev.type === "testResult") {
          results.push(ev.result);
          hooks.onResult?.(ev.result);
        } else if (ev.type === "fatal") {
          return { kind: "fatal", error: ev.kind, message: ev.message, line: ev.line, results };
        }
      }
    }
  } catch (e) {
    if (!signal.aborted) return { kind: "fatal", error: "internal", message: `Lost connection to the compile server: ${(e as Error).message}`, results };
  }
  return { kind: "results", results, totalMs: performance.now() - started };
}
