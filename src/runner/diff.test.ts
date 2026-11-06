import { describe, expect, it } from "vitest";
import { lineDiff } from "./diff";
import { formatValue } from "./format";

describe("lineDiff", () => {
  it("marks identical text as same", () => {
    expect(lineDiff("a\nb", "a\nb").every((o) => o.kind === "same")).toBe(true);
  });
  it("finds a changed element", () => {
    const ops = lineDiff(formatValue([1, 2, 3]), formatValue([1, 9, 3]));
    expect(ops.filter((o) => o.kind === "del").map((o) => o.line.trim())).toEqual(["2,"]);
    expect(ops.filter((o) => o.kind === "add").map((o) => o.line.trim())).toEqual(["9,"]);
  });
  it("handles length differences", () => {
    const ops = lineDiff("a", "a\nb");
    expect(ops.map((o) => o.kind)).toEqual(["same", "add"]);
  });
});

describe("formatValue", () => {
  it("abridges long arrays and strings", () => {
    const text = formatValue(Array.from({ length: 500 }, (_, i) => i));
    expect(text).toContain("more items");
    expect(text.length).toBeLessThan(5000);
    expect(formatValue("x".repeat(10_000)).length).toBeLessThan(4200);
  });
  it("describes undefined and non-finite numbers", () => {
    expect(formatValue(undefined)).toBe("undefined");
    expect(formatValue([NaN, Infinity])).toContain("NaN");
  });
});
