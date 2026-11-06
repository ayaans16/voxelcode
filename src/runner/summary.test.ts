import { describe, expect, it } from "vitest";
import { describeHiddenFailure, summarizeResults } from "./summary";
import type { TestResult } from "./protocol";

const r = (category: string, status: TestResult["status"]): TestResult => ({
  testId: Math.random().toString(),
  category,
  status,
  expected: "1",
  runtimeMs: 1,
  stdout: "",
});

describe("summarizeResults", () => {
  it("counts passes overall and per category", () => {
    const s = summarizeResults([r("basic", "pass"), r("basic", "pass"), r("edge", "fail"), r("large", "timeout")]);
    expect(s.passed).toBe(2);
    expect(s.total).toBe(4);
    expect(s.fraction).toBe(0.5);
    expect(s.byCategory.basic).toEqual({ passed: 2, total: 2 });
    expect(s.failedCategories).toEqual(["edge", "large"]);
    expect(s.anyTimeout).toBe(true);
    expect(s.allPassed).toBe(false);
  });
  it("handles all-pass and empty runs", () => {
    expect(summarizeResults([r("basic", "pass")]).allPassed).toBe(true);
    const empty = summarizeResults([]);
    expect(empty.fraction).toBe(0);
    expect(empty.allPassed).toBe(false);
  });
  it("flags errors", () => {
    expect(summarizeResults([r("basic", "error")]).anyError).toBe(true);
  });
});

describe("describeHiddenFailure", () => {
  it("names the failing categories without drama", () => {
    const text = describeHiddenFailure(summarizeResults([r("basic", "pass"), r("edge", "fail"), r("large", "timeout")]));
    expect(text).toContain("edge cases");
    expect(text).toContain("large inputs");
    expect(text).toContain("time limit");
    expect(text).toContain("1 of 3");
  });
});
