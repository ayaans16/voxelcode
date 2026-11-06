/// <reference lib="webworker" />
import { fromWorkerSchema, toWorkerSchema, type FromWorker } from "./protocol";
import { runJsHarness } from "./harness";
import { lockdownWorkerGlobals } from "./lockdown";

const post = self.postMessage.bind(self) as (m: FromWorker) => void;
let locked = false;

self.onmessage = async (event: MessageEvent) => {
  const parsed = toWorkerSchema.safeParse(event.data);
  if (!parsed.success) {
    post({ type: "fatal", kind: "internal", message: "Malformed message from the page." });
    return;
  }
  const msg = parsed.data;
  if (msg.type === "init") {
    post({ type: "ready" });
    return;
  }
  if (!locked) {
    lockdownWorkerGlobals();
    locked = true;
  }
  if (msg.language !== "javascript") {
    post({ type: "fatal", runId: msg.runId, kind: "internal", message: "This worker only runs JavaScript." });
    return;
  }
  const started = performance.now();
  try {
    const { fatal } = await runJsHarness({
      code: msg.code,
      functionName: msg.functionName,
      tests: msg.tests,
      comparison: msg.comparison,
      timeLimitMs: msg.timeLimitMs,
      onStart: (testId) => post({ type: "testStart", runId: msg.runId, testId }),
      onResult: (result) => post({ type: "testResult", runId: msg.runId, result }),
    });
    if (fatal) {
      post({ type: "fatal", runId: msg.runId, kind: fatal.kind, message: fatal.message, line: fatal.line });
      return;
    }
    post({ type: "done", runId: msg.runId, totalMs: performance.now() - started });
  } catch (e) {
    post({ type: "fatal", runId: msg.runId, kind: "internal", message: String((e as Error)?.message ?? e) });
  }
};

// Validate the contract at type level only (keeps the import used in bundlers that tree-shake).
void fromWorkerSchema;
