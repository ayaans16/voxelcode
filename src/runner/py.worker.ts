/// <reference lib="webworker" />
import { fromWorkerSchema, toWorkerSchema, type FromWorker } from "./protocol";
import { runTestsWith } from "./harness";
import { installPyHelper, loadPythonSolution, type PyodideLike } from "./pyBridge";
import { lockdownWorkerGlobals } from "./lockdown";

const post = self.postMessage.bind(self) as (m: FromWorker) => void;

let pyodide: (PyodideLike & Record<string, unknown>) | null = null;
let loading: Promise<void> | null = null;

async function ensurePyodide(): Promise<void> {
  if (pyodide) return;
  loading ??= (async () => {
    // Pyodide is self-hosted in /public/pyodide (see scripts/copy-assets.mjs). Loaded by URL at runtime.
    const base = `${self.location.origin}/pyodide/`;
    const mod = (await import(/* @vite-ignore */ `${base}pyodide.mjs`)) as {
      loadPyodide: (o: { indexURL: string }) => Promise<PyodideLike & Record<string, unknown>>;
    };
    pyodide = await mod.loadPyodide({ indexURL: base });
    installPyHelper(pyodide);
    // Only now (after every legitimate download) close the doors. `navigator` stays: Pyodide may read it.
    lockdownWorkerGlobals(undefined, ["navigator"]);
  })();
  await loading;
}

self.onmessage = async (event: MessageEvent) => {
  const parsed = toWorkerSchema.safeParse(event.data);
  if (!parsed.success) {
    post({ type: "fatal", kind: "internal", message: "Malformed message from the page." });
    return;
  }
  const msg = parsed.data;
  try {
    if (msg.type === "init") {
      await ensurePyodide();
      post({ type: "ready" });
      return;
    }
    if (msg.language !== "python") {
      post({ type: "fatal", runId: msg.runId, kind: "internal", message: "This worker only runs Python." });
      return;
    }
    await ensurePyodide();
    const started = performance.now();
    const loaded = loadPythonSolution(pyodide!, msg.code, msg.functionName);
    if (!loaded.ok) {
      post({ type: "fatal", runId: msg.runId, kind: loaded.kind, message: loaded.message, line: loaded.line });
      return;
    }
    await runTestsWith({
      tests: msg.tests,
      comparison: msg.comparison,
      timeLimitMs: msg.timeLimitMs,
      invoke: loaded.invoke,
      onStart: (testId) => post({ type: "testStart", runId: msg.runId, testId }),
      onResult: (result) => post({ type: "testResult", runId: msg.runId, result }),
    });
    post({ type: "done", runId: msg.runId, totalMs: performance.now() - started });
  } catch (e) {
    post({ type: "fatal", runId: "runId" in msg ? msg.runId : undefined, kind: "internal", message: String((e as Error)?.message ?? e) });
  }
};

void fromWorkerSchema;
