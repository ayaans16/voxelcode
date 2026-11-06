/**
 * Runs REAL toolchains (JDK, C compiler, Go) against every problem's native
 * reference solutions, plus behaviour tests (compile errors, exceptions,
 * infinite loops, stdout capture). Each language's tests are skipped when its
 * toolchain is not installed, so CI without them stays green.
 */
import { beforeAll, describe, expect, it } from "vitest";
import { PROBLEMS } from "@/problems";
import { functionNameFor, type NativeLanguage } from "@/problems/languages";
import { defaultStarter } from "@/problems/starters";
import { runNative } from "./execute";
import { detectRuntimes, type RuntimeInfo } from "./runtimes";
import { timeLimitFor, toRunTests } from "../problemRun";
import type { NativeEvent, TestResult } from "../protocol";
import type { RunTest } from "../protocol";

let runtimes: Record<NativeLanguage, RuntimeInfo>;
beforeAll(async () => {
  runtimes = await detectRuntimes(true);
});

async function collect(input: Parameters<typeof runNative>[0]) {
  const events: NativeEvent[] = [];
  await runNative(input, (e) => events.push(e));
  const results = events.filter((e): e is Extract<NativeEvent, { type: "testResult" }> => e.type === "testResult").map((e) => e.result);
  const fatal = events.find((e): e is Extract<NativeEvent, { type: "fatal" }> => e.type === "fatal");
  return { events, results, fatal };
}

const LANGS: NativeLanguage[] = ["java", "c", "go"];

for (const lang of LANGS) {
  describe(`native: ${lang}`, () => {
    const skip = () => !runtimes?.[lang]?.available;

    const withRefs = PROBLEMS.filter((p) => p.referenceSolution[lang]);
    it("has reference solutions for a good spread of problems", () => {
      expect(withRefs.length).toBeGreaterThanOrEqual(8);
    });

    for (const problem of withRefs) {
      it(`${problem.slug}: reference passes every visible and hidden test`, async (ctx) => {
        if (skip()) return ctx.skip();
        for (const which of ["visible", "hidden"] as const) {
          const { results, fatal } = await collect({
            language: lang,
            code: problem.referenceSolution[lang]!,
            functionName: functionNameFor(problem.signature.name, lang),
            params: problem.signature.params,
            returns: problem.signature.returns,
            tests: toRunTests(problem, which),
            comparison: problem.comparison,
            timeLimitMs: timeLimitFor(problem, lang) * 4,
          });
          expect(fatal).toBeUndefined();
          const bad = results.filter((r) => r.status !== "pass").map((r) => `${r.testId} ${r.status} got ${r.actual} want ${r.expected} ${r.error?.message ?? ""}`);
          expect(bad).toEqual([]);
          expect(results).toHaveLength(which === "visible" ? problem.visibleTests.length : problem.hiddenTests.length);
        }
      }, 120_000);
    }

    describe("behaviour", () => {
      const problem = PROBLEMS.find((p) => p.slug === "budget-pair")!;
      const fn = functionNameFor(problem.signature.name, lang);
      const base = {
        language: lang,
        functionName: fn,
        params: problem.signature.params,
        returns: problem.signature.returns,
        comparison: problem.comparison,
        timeLimitMs: 1500,
      };
      const t = (args: unknown[], expected: unknown): RunTest => ({ id: `t${Math.random()}`, category: "basic", args, expected });

      it("starter code compiles and its wrong answer is reported as a failure, not a crash", async (ctx) => {
        if (skip()) return ctx.skip();
        const starter = defaultStarter(problem.signature, lang);
        const { results, fatal } = await collect({ ...base, code: starter, tests: [t([[1, 2, 3], 5], 5)] });
        expect(fatal).toBeUndefined();
        expect(results[0]!.status).toBe("fail");
      }, 60_000);

      it("reports compile errors with a message", async (ctx) => {
        if (skip()) return ctx.skip();
        const bad = problem.referenceSolution[lang]!.replace("return", "retrun");
        const { fatal } = await collect({ ...base, code: bad, tests: [t([[1, 2], 3], 3)] });
        expect(fatal?.kind).toBe("compile");
        expect(fatal?.message.length).toBeGreaterThan(5);
        expect(fatal?.message).not.toMatch(/voxelcode-/); // temp paths are scrubbed
      }, 60_000);

      it("kills infinite loops, reports time limit exceeded, and still runs the remaining tests", async (ctx) => {
        if (skip()) return ctx.skip();
        const loop: Record<NativeLanguage, string> = {
          java: `class Solution { public static int ${fn}(int[] prices, int budget) { if (budget == 5) { while (true) {} } return 7; } }`,
          c: `int ${fn}(const int *prices, int pricesLen, int budget) { if (budget == 5) { volatile int x = 0; while (1) { x++; } } return 7; }`,
          go: `package main\nfunc ${fn}(prices []int, budget int) int { if budget == 5 { for { } } ; return 7 }`,
        };
        const tests = [t([[1], 1], 7), t([[1], 5], 0), t([[1], 2], 7)];
        const started = Date.now();
        const { results } = await collect({ ...base, code: loop[lang], tests, timeLimitMs: 800 });
        expect(Date.now() - started).toBeLessThan(30_000);
        expect(results.map((r) => r.status)).toEqual(["pass", "timeout", "pass"]);
        expect(results[1]!.error?.message).toMatch(/Time limit exceeded/);
      }, 60_000);

      it("captures print output per test and reports exceptions", async (ctx) => {
        if (skip()) return ctx.skip();
        const code: Record<NativeLanguage, string> = {
          java: `class Solution { public static int ${fn}(int[] prices, int budget) { System.out.println("hi " + budget); if (budget == 9) throw new IllegalStateException("boom"); return budget; } }`,
          c: `int ${fn}(const int *prices, int pricesLen, int budget) { printf("hi %d\\n", budget); if (budget == 9) { abort(); } return budget; }`,
          go: `package main\nimport "fmt"\nfunc ${fn}(prices []int, budget int) int { fmt.Println("hi", budget); if budget == 9 { panic("boom") }; return budget }`,
        };
        const { results } = await collect({ ...base, code: code[lang], tests: [t([[1], 3], 3), t([[1], 9], 9), t([[1], 4], 4)] });
        expect(results[0]).toMatchObject({ status: "pass" });
        expect(results[0]!.stdout.trim()).toBe("hi 3");
        expect(results[1]!.status).toBe("error");
        expect(results[2]).toMatchObject({ status: "pass" }); // later tests still run after a crash/exception
        if (lang !== "c") expect(results[1]!.error?.message).toContain("boom");
      }, 60_000);

      it("explains a missing function before compiling", async (ctx) => {
        if (skip()) return ctx.skip();
        const code = lang === "java" ? "class Solution { }" : lang === "go" ? "package main\n" : "int other(void) { return 1; }";
        const { fatal } = await collect({ ...base, code, tests: [t([[1], 1], 1)] });
        expect(fatal?.kind).toBe("missing_function");
        expect(fatal?.message).toContain(fn);
      }, 30_000);
    });
  });
}

describe("native: unavailable toolchains", () => {
  it("is reported as a clear fatal, not a crash", async () => {
    const info = runtimes;
    // Pretend nothing is installed by asking for a language and checking the message shape when missing.
    for (const lang of LANGS) {
      if (info[lang].available) continue;
      const { fatal } = await collect({ language: lang, code: "x", functionName: "f", params: [], returns: "int", tests: [], comparison: "exact", timeLimitMs: 1000 });
      expect(fatal?.kind).toBe("unavailable");
    }
  });
});

export type { TestResult };
