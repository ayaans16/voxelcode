import { describe, expect, it } from "vitest";
import { compileUserFunction, runJsHarness } from "./harness";
import type { RunTest } from "./protocol";

const tests = (...pairs: [unknown[], unknown, string?][]): RunTest[] =>
  pairs.map(([args, expected, category], i) => ({ id: `t${i}`, category: category ?? "basic", args, expected }));

const run = (code: string, ts: RunTest[], timeLimitMs = 1000, comparison: "exact" | "unordered" = "exact") =>
  runJsHarness({ code, functionName: "f", tests: ts, comparison, timeLimitMs });

describe("runJsHarness", () => {
  it("passes correct answers and records runtime", async () => {
    const { results } = await run("function f(a,b){return a+b}", tests([[1, 2], 3], [[5, 5], 10]));
    expect(results.map((r) => r.status)).toEqual(["pass", "pass"]);
    expect(results[0]!.runtimeMs).toBeGreaterThanOrEqual(0);
  });

  it("reports actual vs expected on wrong answers", async () => {
    const { results } = await run("function f(a){return a+1}", tests([[1], 3]));
    expect(results[0]).toMatchObject({ status: "fail", actual: "2", expected: "3" });
  });

  it("treats returning undefined as a failure, not a pass", async () => {
    const { results } = await run("function f(){}", tests([[], null]));
    expect(results[0]!.status).toBe("fail");
    expect(results[0]!.actual).toBe("undefined");
  });

  it("captures exceptions with name and message", async () => {
    const { results } = await run("function f(){ throw new TypeError('boom') }", tests([[], 1]));
    expect(results[0]).toMatchObject({ status: "error", error: { name: "TypeError", message: "boom" } });
  });

  it("captures console output per test", async () => {
    const { results } = await run(
      "function f(x){ console.log('saw', x); console.log([1,2]); return x }",
      tests([[1], 1], [[2], 2]),
    );
    expect(results[0]!.stdout).toBe("saw 1\n[1,2]");
    expect(results[1]!.stdout).toBe("saw 2\n[1,2]");
  });

  it("does not let one test's mutations leak into the next", async () => {
    const shared = [3, 1, 2];
    const ts: RunTest[] = [
      { id: "a", category: "basic", args: [shared], expected: [1, 2, 3] },
      { id: "b", category: "basic", args: [shared], expected: [1, 2, 3] },
    ];
    const { results } = await run("function f(a){ return a.sort() }", ts);
    expect(results.map((r) => r.status)).toEqual(["pass", "pass"]);
    expect(shared).toEqual([3, 1, 2]);
  });

  it("flags correct-but-slow answers as time limit exceeded", async () => {
    let t = 0;
    const { results } = await runJsHarness({
      code: "function f(){ return 1 }",
      functionName: "f",
      tests: tests([[], 1]),
      comparison: "exact",
      timeLimitMs: 100,
      now: () => (t += 500), // every call "takes" 500ms
    });
    expect(results[0]!.status).toBe("timeout");
    expect(results[0]!.error?.message).toMatch(/Time limit exceeded/);
  });

  it("supports async functions", async () => {
    const { results } = await run("async function f(){ return 7 }", tests([[], 7]));
    expect(results[0]!.status).toBe("pass");
  });

  it("honours the comparison mode", async () => {
    const { results } = await run("function f(){ return [2,1] }", tests([[], [1, 2]]), 1000, "unordered");
    expect(results[0]!.status).toBe("pass");
  });

  it("streams onStart / onResult in order", async () => {
    const events: string[] = [];
    await runJsHarness({
      code: "function f(x){return x}",
      functionName: "f",
      tests: tests([[1], 1], [[2], 2]),
      comparison: "exact",
      timeLimitMs: 1000,
      onStart: (id) => events.push(`start:${id}`),
      onResult: (r) => events.push(`result:${r.testId}`),
    });
    expect(events).toEqual(["start:t0", "result:t0", "start:t1", "result:t1"]);
  });
});

describe("compileUserFunction", () => {
  it("reports syntax errors with a line number relative to the user's code", () => {
    const out = compileUserFunction("function f(){\n  return (;\n}", "f");
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.kind).toBe("syntax");
      expect(out.message).toMatch(/SyntaxError/);
    }
  });
  it("tells the learner when the function is missing", () => {
    const out = compileUserFunction("const x = 1;", "f");
    expect(out).toMatchObject({ ok: false, kind: "missing_function", message: "Define a function named f." });
  });
  it("accepts arrow functions assigned to the name", () => {
    expect(compileUserFunction("const f = (a) => a * 2;", "f").ok).toBe(true);
  });
});
