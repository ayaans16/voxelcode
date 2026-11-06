import { describe, expect, it } from "vitest";
import { fromWorkerSchema, testResultSchema, toWorkerSchema } from "./protocol";

describe("protocol", () => {
  it("accepts a valid run request", () => {
    const r = toWorkerSchema.safeParse({
      type: "run",
      runId: "r1",
      language: "javascript",
      code: "function f(){}",
      functionName: "f",
      tests: [{ id: "t0", category: "basic", args: [1], expected: 2 }],
      comparison: "exact",
      timeLimitMs: 1000,
    });
    expect(r.success).toBe(true);
  });
  it("rejects unknown languages, bad comparisons and non-positive limits", () => {
    const base = { type: "run", runId: "r", code: "", functionName: "f", tests: [], comparison: "exact", timeLimitMs: 1 };
    expect(toWorkerSchema.safeParse({ ...base, language: "ruby" }).success).toBe(false);
    expect(toWorkerSchema.safeParse({ ...base, language: "python", comparison: "fuzzy" }).success).toBe(false);
    expect(toWorkerSchema.safeParse({ ...base, language: "python", timeLimitMs: 0 }).success).toBe(false);
  });
  it("parses every worker message type", () => {
    const result = { testId: "t", category: "basic", status: "pass", expected: "1", runtimeMs: 1.5, stdout: "" };
    expect(testResultSchema.safeParse(result).success).toBe(true);
    for (const m of [
      { type: "ready" },
      { type: "testStart", runId: "r", testId: "t" },
      { type: "testResult", runId: "r", result },
      { type: "done", runId: "r", totalMs: 3 },
      { type: "fatal", kind: "syntax", message: "oops", line: 2 },
    ]) {
      expect(fromWorkerSchema.safeParse(m).success).toBe(true);
    }
  });
  it("rejects garbage so a forged or corrupt message is ignored", () => {
    expect(fromWorkerSchema.safeParse({ type: "testResult", runId: "r", result: { status: "pass" } }).success).toBe(false);
    expect(fromWorkerSchema.safeParse({ type: "nope" }).success).toBe(false);
    expect(fromWorkerSchema.safeParse("hello").success).toBe(false);
    expect(testResultSchema.safeParse({ testId: "t", category: "c", status: "maybe", expected: "", runtimeMs: 0, stdout: "" }).success).toBe(false);
  });
});
