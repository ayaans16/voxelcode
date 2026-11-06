import { describe, expect, it } from "vitest";
import { cellNoise, hashString, mulberry32, shuffle } from "./prng";

describe("mulberry32", () => {
  it("is deterministic for a given seed", () => {
    const a = mulberry32(42);
    const b = mulberry32(42);
    for (let i = 0; i < 100; i++) expect(a()).toBe(b());
  });
  it("differs between seeds", () => {
    expect(mulberry32(1)()).not.toBe(mulberry32(2)());
  });
  it("stays within [0, 1)", () => {
    const r = mulberry32(7);
    for (let i = 0; i < 1000; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe("hashString", () => {
  it("is stable and distinguishes strings", () => {
    expect(hashString("two-sum")).toBe(hashString("two-sum"));
    expect(hashString("two-sum")).not.toBe(hashString("two-sums"));
    expect(hashString("")).toBe(0x811c9dc5);
  });
});

describe("cellNoise / shuffle", () => {
  it("cellNoise is order independent and in range", () => {
    expect(cellNoise(1, 2, 3, 4)).toBe(cellNoise(1, 2, 3, 4));
    const v = cellNoise(9, -5, 0, 17);
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThan(1);
  });
  it("shuffle keeps all items and is seeded", () => {
    const items = [1, 2, 3, 4, 5, 6];
    const a = shuffle(mulberry32(3), items);
    expect(a.slice().sort()).toEqual(items);
    expect(shuffle(mulberry32(3), items)).toEqual(a);
  });
});
