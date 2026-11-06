/**
 * Message protocol between the main thread and a runner worker.
 * Every message is validated with zod on the receiving side.
 *
 *   main -> worker:  init | run
 *   worker -> main:  ready | testStart | testResult | done | fatal
 *
 * `testStart` exists so the main thread can start a per-test watchdog: a
 * worker stuck in an infinite loop cannot answer, so the MAIN thread kills it.
 */
import { z } from "zod";
import { comparisonSchema, languageSchema } from "@/problems/schema";

export const runTestSchema = z.object({
  id: z.string(),
  category: z.string(),
  args: z.array(z.unknown()),
  expected: z.unknown(),
});
export type RunTest = z.infer<typeof runTestSchema>;

export const toWorkerSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("init") }),
  z.object({
    type: z.literal("run"),
    runId: z.string(),
    language: languageSchema,
    code: z.string(),
    functionName: z.string(),
    tests: z.array(runTestSchema),
    comparison: comparisonSchema,
    /** Per-test limit in ms. */
    timeLimitMs: z.number().positive(),
  }),
]);
export type ToWorker = z.infer<typeof toWorkerSchema>;

export const testStatusSchema = z.enum(["pass", "fail", "error", "timeout"]);
export type TestStatus = z.infer<typeof testStatusSchema>;

export const testResultSchema = z.object({
  testId: z.string(),
  category: z.string(),
  status: testStatusSchema,
  /** Abridged text of what the function returned (omitted on pass). */
  actual: z.string().optional(),
  /** Abridged text of the expected value. */
  expected: z.string(),
  runtimeMs: z.number(),
  /** Everything printed during this test. */
  stdout: z.string(),
  error: z.object({ name: z.string(), message: z.string(), line: z.number().optional() }).optional(),
});
export type TestResult = z.infer<typeof testResultSchema>;

export const fromWorkerSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("ready") }),
  z.object({ type: z.literal("testStart"), runId: z.string(), testId: z.string() }),
  z.object({ type: z.literal("testResult"), runId: z.string(), result: testResultSchema }),
  z.object({ type: z.literal("done"), runId: z.string(), totalMs: z.number() }),
  z.object({
    type: z.literal("fatal"),
    runId: z.string().optional(),
    kind: z.enum(["syntax", "missing_function", "internal"]),
    message: z.string(),
    line: z.number().optional(),
  }),
]);
export type FromWorker = z.infer<typeof fromWorkerSchema>;

/**
 * Events streamed (as NDJSON, one JSON object per line) from the local compile
 * server for Java, C and Go. Mirrors the worker protocol, plus compile status.
 */
export const nativeEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("status"), status: z.enum(["compiling", "running"]) }),
  z.object({ type: z.literal("testStart"), testId: z.string() }),
  z.object({ type: z.literal("testResult"), result: testResultSchema }),
  z.object({ type: z.literal("done"), totalMs: z.number() }),
  z.object({
    type: z.literal("fatal"),
    kind: z.enum(["compile", "missing_function", "unavailable", "internal"]),
    message: z.string(),
    line: z.number().optional(),
  }),
]);
export type NativeEvent = z.infer<typeof nativeEventSchema>;
