import { defaultStarter } from "./starters";
import type { PatternId } from "@/engine/patterns";
import { problemSchema, type Problem, type ProblemInput, type TestCase, type Language } from "./schema";

/**
 * Validates a problem at load time and returns it with defaults applied.
 * Throws a readable error listing every problem with the file, so a broken
 * file fails the build and CI instead of failing at runtime.
 */
export function defineProblem(input: ProblemInput): Problem {
  const parsed = problemSchema.safeParse(input);
  if (!parsed.success) {
    const slug = (input as { slug?: string }).slug ?? "<unknown>";
    const lines = parsed.error.issues.map((i) => `  - ${i.path.join(".") || "(root)"}: ${i.message}`);
    throw new Error(`Invalid problem "${slug}":\n${lines.join("\n")}`);
  }
  return parsed.data;
}

/**
 * Builds an approach checkpoint with the standard complexity choices.
 * `others` are 2 to 5 wrong-but-plausible patterns; `time` / `space` are the right answers.
 */
export function checkpoint(o: { pattern: PatternId; others: PatternId[]; time: string; space: string; why: string }) {
  const T = ["O(1)", "O(log n)", "O(n)", "O(n log n)", "O(n^2)", "O(2^n)"];
  const S = ["O(1)", "O(log n)", "O(n)", "O(n^2)"];
  return {
    patternOptions: [o.pattern, ...o.others],
    correctPattern: o.pattern,
    complexity: {
      time: T.includes(o.time) ? T : [...T, o.time],
      space: S.includes(o.space) ? S : [...S, o.space],
      correctTime: o.time,
      correctSpace: o.space,
    },
    explanation: o.why,
  };
}

/** Shorthand for writing tests by hand: t("basic", [args...], expected). */
export function t(category: string, args: unknown[], expected: unknown): TestCase {
  return { category, args, expected };
}

/** Starter code: the problem's own, or one generated from the signature. */
export function starterFor(problem: Pick<Problem, "signature" | "starter">, language: Language): string {
  return problem.starter?.[language] ?? defaultStarter(problem.signature, language);
}

/** Small deterministic generator for building large test inputs at authoring time. */
export function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}
