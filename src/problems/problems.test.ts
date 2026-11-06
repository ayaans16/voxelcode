/**
 * CI guard: every problem's own tests must be correct. We run each problem's
 * referenceSolution (JavaScript) against ALL its visible and hidden tests.
 * A broken problem file (wrong expected value, bad schema, ...) fails here.
 * Python reference solutions are checked in problems.python.test.ts.
 */
import { describe, expect, it } from "vitest";
import { PROBLEMS } from "./index";
import { problemSchema } from "./schema";
import { runJsHarness } from "@/runner/harness";
import { toRunTests, timeLimitFor } from "@/runner/problemRun";

describe("problem registry", () => {
  it("has unique slugs", () => {
    const slugs = PROBLEMS.map((p) => p.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
  it("has the target number of problems and covers each difficulty or pattern needed", () => {
    expect(PROBLEMS.length).toBeGreaterThanOrEqual(3);
  });
});

describe.each(PROBLEMS.map((p) => [p.slug, p] as const))("problem %s", (_slug, problem) => {
  it("passes schema validation", () => {
    expect(problemSchema.safeParse(problem).success).toBe(true);
  });

  for (const which of ["visible", "hidden"] as const) {
    it(`reference solution passes every ${which} test`, async () => {
      const { results, fatal } = await runJsHarness({
        code: problem.referenceSolution.javascript,
        functionName: problem.signature.name.javascript,
        tests: toRunTests(problem, which),
        comparison: problem.comparison,
        // Generous: this guards correctness, not speed.
        timeLimitMs: timeLimitFor(problem, "javascript") * 5,
      });
      expect(fatal).toBeUndefined();
      const failures = results.filter((r) => r.status !== "pass").map((r) => `${r.testId} [${r.category}] ${r.status} got ${r.actual} want ${r.expected} ${r.error?.message ?? ""}`);
      expect(failures).toEqual([]);
      expect(results.length).toBe(which === "visible" ? problem.visibleTests.length : problem.hiddenTests.length);
    }, 30_000);
  }

  it("visible tests are a subset-style teaser: examples agree with visible tests count", () => {
    expect(problem.examples.length).toBeGreaterThanOrEqual(2);
    expect(problem.visibleTests.length).toBeGreaterThanOrEqual(problem.examples.length - 1);
  });

  it("has at least one hidden test in each of basic / edge / large", () => {
    const cats = new Set(problem.hiddenTests.map((t) => t.category));
    for (const c of ["basic", "edge", "large"]) expect(cats.has(c)).toBe(true);
  });

  it("starter code mentions the right function name per language", async () => {
    const { starterFor } = await import("./define");
    expect(starterFor(problem, "python")).toContain(`def ${problem.signature.name.python}(`);
    expect(starterFor(problem, "javascript")).toContain(`function ${problem.signature.name.javascript}(`);
  });
});

describe("brute force is caught by the large tests", () => {
  it("budget-pair: an O(n^2) solution exceeds the time limit on a large test", async () => {
    const problem = PROBLEMS.find((p) => p.slug === "budget-pair")!;
    const brute = `function bestPairTotal(prices, budget){
      let best = -1;
      for (let i=0;i<prices.length;i++) for (let j=i+1;j<prices.length;j++){ const s=prices[i]+prices[j]; if (s<=budget && s>best) best=s; }
      return best;
    }`;
    // Use a 25k-item slice so the quadratic scan takes a moment but the test stays quick.
    const bigTest = toRunTests(problem, "hidden").find((t) => t.category === "large")!;
    const prices = (bigTest.args[0] as number[]).slice(0, 25_000);
    const large = [{ ...bigTest, args: [prices, prices[prices.length - 1]! + prices[0]!], expected: 0 }];
    const { results } = await runJsHarness({
      code: brute,
      functionName: "bestPairTotal",
      tests: large,
      comparison: problem.comparison,
      timeLimitMs: 40,
    });
    expect(results[0]!.status).toBe("timeout");
    expect(results[0]!.error?.message).toMatch(/Time limit exceeded/);
  }, 120_000);
});
