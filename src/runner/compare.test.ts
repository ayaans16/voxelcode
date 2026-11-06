import { describe, expect, it } from "vitest";
import { compareResults, deepEqual } from "./compare";

describe("exact", () => {
  it("compares deeply", () => {
    expect(compareResults([1, [2, 3], { a: 1, b: [4] }], [1, [2, 3], { b: [4], a: 1 }], "exact")).toBe(true);
    expect(compareResults([1, 2], [2, 1], "exact")).toBe(false);
    expect(compareResults([1, 2], [1, 2, 3], "exact")).toBe(false);
    expect(compareResults("ab", "ab", "exact")).toBe(true);
    expect(compareResults(null, null, "exact")).toBe(true);
  });
  it("distinguishes types and missing returns", () => {
    expect(compareResults("1", 1, "exact")).toBe(false);
    expect(compareResults(undefined, null, "exact")).toBe(false);
    expect(compareResults(0, false, "exact")).toBe(false);
    expect(compareResults({ a: 1 }, { a: 1, b: 2 }, "exact")).toBe(false);
  });
  it("treats -0 as 0 and NaN as NaN", () => {
    expect(deepEqual(-0, 0)).toBe(true);
    expect(deepEqual(NaN, NaN)).toBe(true);
  });
});

describe("unordered", () => {
  it("ignores order at the top level, keeps multiplicity", () => {
    expect(compareResults([3, 1, 2], [1, 2, 3], "unordered")).toBe(true);
    expect(compareResults([1, 1, 2], [1, 2, 2], "unordered")).toBe(false);
    expect(compareResults([1, 2], [1, 2, 3], "unordered")).toBe(false);
  });
  it("compares nested items exactly", () => {
    expect(compareResults([[1, 2], [3]], [[3], [1, 2]], "unordered")).toBe(true);
    expect(compareResults([[2, 1], [3]], [[3], [1, 2]], "unordered")).toBe(false);
    expect(compareResults([{ a: 1, b: 2 }], [{ b: 2, a: 1 }], "unordered")).toBe(true);
  });
  it("rejects non-arrays", () => {
    expect(compareResults(5, [5], "unordered")).toBe(false);
  });
});

describe("float tolerance", () => {
  it("uses an absolute tolerance by default", () => {
    expect(compareResults(0.1 + 0.2, 0.3, { float: {} })).toBe(true);
    expect(compareResults(0.3001, 0.3, { float: {} })).toBe(false);
  });
  it("supports abs and rel", () => {
    expect(compareResults(1.04, 1, { float: { abs: 0.05 } })).toBe(true);
    expect(compareResults(1.06, 1, { float: { abs: 0.05 } })).toBe(false);
    expect(compareResults(1_000_100, 1_000_000, { float: { rel: 1e-3 } })).toBe(true);
    expect(compareResults(1_002_000, 1_000_000, { float: { rel: 1e-3 } })).toBe(false);
  });
  it("recurses through arrays and objects", () => {
    expect(compareResults([[0.1 + 0.2], { x: 1 + 1e-9 }], [[0.3], { x: 1 }], { float: {} })).toBe(true);
    expect(compareResults([1, 2], [1, 2, 3], { float: {} })).toBe(false);
  });
  it("is not fooled by NaN or Infinity", () => {
    expect(compareResults(NaN, 1, { float: {} })).toBe(false);
    expect(compareResults(Infinity, Infinity, { float: {} })).toBe(true);
    expect(compareResults(Infinity, 1e308, { float: {} })).toBe(false);
  });
});
