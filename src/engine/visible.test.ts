import { describe, expect, it } from "vitest";
import { autumnFactor, visibleCount } from "./visible";
import { generateTree } from "./generate";

describe("visibleCount", () => {
  it("floors progress * N and clamps", () => {
    expect(visibleCount(0, 100)).toBe(0);
    expect(visibleCount(0.05, 100)).toBe(5);
    expect(visibleCount(0.999, 100)).toBe(99);
    expect(visibleCount(1, 100)).toBe(100);
    expect(visibleCount(5, 100)).toBe(100);
    expect(visibleCount(-1, 100)).toBe(0);
    expect(visibleCount(NaN, 100)).toBe(0);
  });
  it("is monotonic in progress", () => {
    let prev = 0;
    for (let i = 0; i <= 1000; i++) {
      const c = visibleCount(i / 1000, 437);
      expect(c).toBeGreaterThanOrEqual(prev);
      prev = c;
    }
  });
  it("visible tree at a higher progress contains the lower one as a prefix", () => {
    const tree = generateTree({ seed: 5, species: "pine", difficulty: "medium" });
    const a = tree.slice(0, visibleCount(0.3, tree.length));
    const b = tree.slice(0, visibleCount(0.6, tree.length));
    expect(b.slice(0, a.length)).toEqual(a);
  });
});

describe("autumnFactor", () => {
  it("ramps from green to gold and returns to 0 on a broken streak", () => {
    expect(autumnFactor(0, 14)).toBe(0);
    expect(autumnFactor(7, 14)).toBe(0.5);
    expect(autumnFactor(30, 14)).toBe(1);
  });
});
