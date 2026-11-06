/**
 * Problem file format, versioned. Bump PROBLEM_SCHEMA_VERSION and add a
 * migration in ./define.ts if you ever change the shape in a breaking way.
 */
import { z } from "zod";
import { PATTERN_IDS } from "@/engine/patterns";

export const PROBLEM_SCHEMA_VERSION = 1 as const;

import { LANGUAGES, VALUE_TYPES, type Language } from "./languages";

export { LANGUAGES, type Language };
export const languageSchema = z.enum(LANGUAGES);
const valueType = z.enum(VALUE_TYPES);

export const comparisonSchema = z.union([
  /** Deep equality. */
  z.literal("exact"),
  /** Top-level array compared as a multiset (order ignored). */
  z.literal("unordered"),
  /** Numbers equal within tolerance (recursively through arrays). */
  z.object({ float: z.object({ abs: z.number().nonnegative().optional(), rel: z.number().nonnegative().optional() }) }),
]);
export type Comparison = z.infer<typeof comparisonSchema>;

const identifier = z.string().regex(/^[A-Za-z_][A-Za-z0-9_]*$/, "must be a valid identifier");

export const testSchema = z.object({
  /** Category shown to the learner when a hidden test fails: "basic", "edge", "large", ... */
  category: z.string().min(1),
  /** Positional arguments to the function, as plain JSON values. */
  args: z.array(z.unknown()),
  expected: z.unknown(),
});
export type TestCase = z.infer<typeof testSchema>;

export const problemSchema = z
  .object({
    schemaVersion: z.literal(PROBLEM_SCHEMA_VERSION),
    slug: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "kebab-case slug"),
    title: z.string().min(2),
    difficulty: z.enum(["easy", "medium", "hard"]),
    patterns: z.array(z.enum(PATTERN_IDS)).min(1),
    /** Markdown. Original writing only. */
    statement: z.string().min(40),
    constraints: z.array(z.string().min(1)).min(1),
    examples: z
      .array(z.object({ input: z.string(), output: z.string(), explanation: z.string().optional() }))
      .min(2)
      .max(3),
    signature: z.object({
      name: z.object({ python: identifier, javascript: identifier }),
      params: z.array(z.object({ name: identifier, type: valueType })),
      returns: valueType,
    }),
    /** Optional: if omitted, starter code is generated from the signature. */
    starter: z.object({ python: z.string(), javascript: z.string(), java: z.string(), c: z.string(), go: z.string() }).partial().optional(),
    comparison: comparisonSchema.default("exact"),
    /** Per-test time limit for JavaScript, in milliseconds. */
    timeLimitMs: z.number().int().positive().default(2000),
    /** Python (Pyodide) is slower, so its limit is timeLimitMs * this factor. */
    pythonTimeFactor: z.number().positive().default(4),
    visibleTests: z.array(testSchema).min(1),
    hiddenTests: z.array(testSchema).min(1),
    /** Progressive: each hint reveals a bit more than the last. */
    hints: z.array(z.string().min(1)).min(1).max(5),
    /** Markdown, unlocked after a solve or after viewing all hints. */
    editorial: z.string().min(40),
    approachCheckpoint: z.object({
      patternOptions: z.array(z.enum(PATTERN_IDS)).min(3).max(6),
      correctPattern: z.enum(PATTERN_IDS),
      complexity: z.object({
        time: z.array(z.string()).min(2),
        space: z.array(z.string()).min(2),
        correctTime: z.string(),
        correctSpace: z.string(),
      }),
      explanation: z.string().min(20),
    }),
    /** Used only by the test suite, to prove the problem's own tests are correct. */
    /** python and javascript are required; java, c and go are optional (checked by the native tests when present). */
    referenceSolution: z.object({
      python: z.string().min(1),
      javascript: z.string().min(1),
      java: z.string().min(1).optional(),
      c: z.string().min(1).optional(),
      go: z.string().min(1).optional(),
    }),
  })
  .superRefine((p, ctx) => {
    const issue = (message: string, path: (string | number)[] = []) => ctx.addIssue({ code: "custom", message, path });
    const nParams = p.signature.params.length;
    for (const group of ["visibleTests", "hiddenTests"] as const) {
      p[group].forEach((t, i) => {
        if (t.args.length !== nParams) {
          issue(`${group}[${i}] has ${t.args.length} args but the signature has ${nParams} params`, [group, i, "args"]);
        }
      });
    }
    const cp = p.approachCheckpoint;
    if (!cp.patternOptions.includes(cp.correctPattern)) issue("correctPattern must be one of patternOptions", ["approachCheckpoint", "correctPattern"]);
    if (!cp.complexity.time.includes(cp.complexity.correctTime)) issue("correctTime must be one of complexity.time", ["approachCheckpoint", "complexity", "correctTime"]);
    if (!cp.complexity.space.includes(cp.complexity.correctSpace)) issue("correctSpace must be one of complexity.space", ["approachCheckpoint", "complexity", "correctSpace"]);
    if (new Set(cp.patternOptions).size !== cp.patternOptions.length) issue("patternOptions must be unique", ["approachCheckpoint", "patternOptions"]);
    if (!p.hiddenTests.some((t) => t.category === "large")) {
      issue('include at least one hidden test with category "large" so brute force is caught', ["hiddenTests"]);
    }
  });

/** What an author writes (defaults not yet applied). */
export type ProblemInput = z.input<typeof problemSchema>;
/** A fully validated problem. */
export type Problem = z.output<typeof problemSchema>;
