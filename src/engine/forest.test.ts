import { describe, expect, it } from "vitest";
import { FOREST_SPACING, forestGroundRadius, forestSlot, spiralCell } from "./forest";

describe("spiralCell", () => {
  it("starts at the center and walks outward", () => {
    expect(spiralCell(0)).toEqual([0, 0]);
    expect(spiralCell(1)).toEqual([1, 0]);
    expect(spiralCell(2)).toEqual([1, 1]);
    expect(spiralCell(3)).toEqual([0, 1]);
    expect(spiralCell(4)).toEqual([-1, 1]);
  });
  it("never reuses a cell", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      const k = spiralCell(i).join(",");
      expect(seen.has(k)).toBe(false);
      seen.add(k);
    }
  });
  it("takes steps of exactly one cell", () => {
    for (let i = 1; i < 100; i++) {
      const [x0, z0] = spiralCell(i - 1);
      const [x1, z1] = spiralCell(i);
      expect(Math.abs(x1 - x0) + Math.abs(z1 - z0)).toBe(1);
    }
  });
});

describe("forestSlot", () => {
  it("is deterministic and keeps trees apart", () => {
    const slots = Array.from({ length: 40 }, (_, i) => forestSlot(i, `problem-${i}`));
    expect(forestSlot(7, "problem-7")).toEqual(slots[7]);
    let min = Infinity;
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) min = Math.min(min, Math.hypot(slots[i]!.x - slots[j]!.x, slots[i]!.z - slots[j]!.z));
    }
    expect(min).toBeGreaterThan(FOREST_SPACING * 0.7);
  });
  it("a new tree never moves an existing one", () => {
    expect(forestSlot(3, "a")).toEqual(forestSlot(3, "a"));
  });
});

describe("forestGroundRadius", () => {
  it("grows with the number of trees and covers every tree", () => {
    expect(forestGroundRadius(40)).toBeGreaterThan(forestGroundRadius(5));
    for (let i = 0; i < 20; i++) {
      const s = forestSlot(i, `p${i}`);
      expect(Math.hypot(s.x, s.z)).toBeLessThan(forestGroundRadius(20));
    }
  });
});
