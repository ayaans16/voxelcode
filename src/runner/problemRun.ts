import type { Problem } from "@/problems/schema";
import { functionNameFor, isNativeLanguage, type Language } from "@/problems/languages";
import type { RunTest } from "./protocol";
import type { RunRequest } from "./RunnerClient";

/** Turns a problem's tests into runner payloads with stable ids. */
export function toRunTests(problem: Problem, which: "visible" | "hidden"): RunTest[] {
  const tests = which === "visible" ? problem.visibleTests : problem.hiddenTests;
  return tests.map((t, i) => ({
    id: `${which}-${i}`,
    category: t.category,
    args: t.args,
    expected: t.expected,
  }));
}

/** JVM start-up and JIT warm-up make the first calls slower, so Java gets a more generous limit. */
const NATIVE_FACTOR = { java: 2, c: 1, go: 1 } as const;

export function timeLimitFor(problem: Problem, language: Language): number {
  if (language === "python") return Math.round(problem.timeLimitMs * problem.pythonTimeFactor);
  if (isNativeLanguage(language)) return Math.round(problem.timeLimitMs * NATIVE_FACTOR[language]);
  return problem.timeLimitMs;
}

export function buildRunRequest(problem: Problem, language: Language, code: string, which: "visible" | "hidden"): RunRequest {
  return {
    language,
    code,
    functionName: functionNameFor(problem.signature.name, language),
    tests: toRunTests(problem, which),
    comparison: problem.comparison,
    timeLimitMs: timeLimitFor(problem, language),
    // Java, C and Go run on the local compile server, which looks the tests up itself by slug.
    native: { slug: problem.slug, which },
  };
}
