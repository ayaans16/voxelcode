/**
 * Runs every problem's PYTHON reference solution against all its tests, using
 * real Pyodide in Node. This is what proves the Python starter/signature path
 * and the JSON bridge work, and that tests agree across languages.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { loadPyodide } from "pyodide";
import { PROBLEMS } from "./index";
import { runTestsWith } from "@/runner/harness";
import { installPyHelper, loadPythonSolution, type PyodideLike } from "@/runner/pyBridge";
import { timeLimitFor, toRunTests } from "@/runner/problemRun";

let py: PyodideLike;
beforeAll(async () => {
  py = (await loadPyodide()) as unknown as PyodideLike;
  installPyHelper(py);
}, 120_000);

describe.each(PROBLEMS.map((p) => [p.slug, p] as const))("python reference: %s", (_slug, problem) => {
  for (const which of ["visible", "hidden"] as const) {
    it(`passes every ${which} test`, async () => {
      const loaded = loadPythonSolution(py, problem.referenceSolution.python, problem.signature.name.python);
      if (!loaded.ok) throw new Error(loaded.message);
      const results = await runTestsWith({
        tests: toRunTests(problem, which),
        comparison: problem.comparison,
        timeLimitMs: timeLimitFor(problem, "python") * 5,
        invoke: loaded.invoke,
      });
      const failures = results.filter((r) => r.status !== "pass").map((r) => `${r.testId} ${r.status} got ${r.actual} want ${r.expected} ${r.error?.message ?? ""}`);
      expect(failures).toEqual([]);
    }, 120_000);
  }
});

describe("python bridge behaviours", () => {
  const run = async (code: string, args: unknown[], expected: unknown) => {
    const loaded = loadPythonSolution(py, code, "f");
    if (!loaded.ok) return loaded;
    const [r] = await runTestsWith({ tests: [{ id: "t", category: "basic", args, expected }], comparison: "exact", timeLimitMs: 5000, invoke: loaded.invoke });
    return r!;
  };

  it("reports wrong answers", async () => {
    expect(await run("def f(a):\n    return a + 1", [1], 3)).toMatchObject({ status: "fail", actual: "2" });
  });
  it("captures print output", async () => {
    const r = await run("def f(a):\n    print('hi', a)\n    return a", [4], 4);
    expect(r).toMatchObject({ status: "pass", stdout: "hi 4\n" });
  });
  it("captures exceptions with a line number from the user's code", async () => {
    const r = (await run("def f(a):\n    x = 1\n    return a / 0", [4], 0)) as { status: string; error?: { name: string; line?: number } };
    expect(r.status).toBe("error");
    expect(r.error?.name).toBe("ZeroDivisionError");
    expect(r.error?.line).toBe(3);
  });
  it("reports syntax errors with a line", async () => {
    expect(await run("def f(a):\n    return (", [1], 1)).toMatchObject({ ok: false, kind: "syntax" });
  });
  it("reports a missing function", async () => {
    expect(await run("x = 1", [], 1)).toMatchObject({ ok: false, kind: "missing_function", message: "Define a function named f." });
  });
  it("treats tuples as lists and sets as sorted lists", async () => {
    expect(await run("def f():\n    return (1, 2)", [], [1, 2])).toMatchObject({ status: "pass" });
    expect(await run("def f():\n    return {3, 1, 2}", [], [1, 2, 3])).toMatchObject({ status: "pass" });
  });
  it("returning None is not a pass for a numeric answer", async () => {
    expect(await run("def f():\n    pass", [], 1)).toMatchObject({ status: "fail", actual: "null" });
  });
  it("does not leak state between loads", async () => {
    await run("counter = 5\ndef f():\n    return counter", [], 5);
    expect(await run("def f():\n    return counter", [], 5)).toMatchObject({ status: "error" });
  });
});
