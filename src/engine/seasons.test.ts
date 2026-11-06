import { describe, expect, it } from "vitest";
import { FX_BY_SEASON, GROUND_BY_SEASON, SEASONS, resolveSeason, seasonForDate, seasonalColor } from "./seasons";
import { SPECIES } from "./species";
import { generateTree } from "./generate";

describe("season selection", () => {
  it("maps months to northern-hemisphere seasons", () => {
    const m = (month: number) => seasonForDate(new Date(2026, month, 15));
    expect([0, 1, 11].map(m)).toEqual(["winter", "winter", "winter"]);
    expect([2, 3, 4].map(m)).toEqual(["spring", "spring", "spring"]);
    expect([5, 6, 7].map(m)).toEqual(["summer", "summer", "summer"]);
    expect([8, 9, 10].map(m)).toEqual(["autumn", "autumn", "autumn"]);
  });
  it("auto follows the date, explicit settings win", () => {
    const d = new Date(2026, 0, 10);
    expect(resolveSeason("auto", d)).toBe("winter");
    expect(resolveSeason("summer", d)).toBe("summer");
  });
});

describe("seasonalColor", () => {
  const palette = SPECIES.oak.palette;
  it("summer leaves are the species' own colors", () => {
    expect(seasonalColor("summer", "leaf", palette, false, 1, 2, 3)).toBe(palette.leaf);
  });
  it("is deterministic per cell", () => {
    for (const s of SEASONS) expect(seasonalColor(s, "leaf", palette, false, 4, 5, 6)).toBe(seasonalColor(s, "leaf", palette, false, 4, 5, 6));
  });
  it("autumn leaves turn warm: red channel beats green on every leaf", () => {
    const tree = generateTree({ seed: 3, species: "oak", difficulty: "medium" });
    for (const v of tree.filter((x) => x.type === "leaf")) {
      const c = seasonalColor("autumn", "leaf", palette, false, v.x, v.y, v.z);
      expect((c >> 16) & 255).toBeGreaterThan((c >> 8) & 255);
    }
  });
  it("winter deciduous leaves are all light (snow or ice)", () => {
    const tree = generateTree({ seed: 3, species: "oak", difficulty: "medium" });
    for (const v of tree.filter((x) => x.type === "leaf")) {
      const c = seasonalColor("winter", "leaf", palette, false, v.x, v.y, v.z);
      expect(Math.min((c >> 16) & 255, (c >> 8) & 255, c & 255)).toBeGreaterThan(190);
    }
  });
  it("evergreens keep some green in winter", () => {
    const pine = SPECIES.pine.palette;
    const colors = new Set<number>();
    for (let i = 0; i < 60; i++) colors.add(seasonalColor("winter", "leaf", pine, true, i, i % 7, 3));
    expect(colors.size).toBeGreaterThan(1);
    expect([...colors].some((c) => ((c >> 8) & 255) > (c & 255) + 10 || c !== 0xf2f6fa)).toBe(true);
  });
  it("never changes golden accents", () => {
    for (const s of SEASONS) expect(seasonalColor(s, "golden", palette, false, 1, 1, 1)).toBe(palette.golden);
  });
});

describe("season data", () => {
  it("has ground colors for every season and fx for all but summer", () => {
    for (const s of SEASONS) expect(GROUND_BY_SEASON[s].grass.length).toBeGreaterThan(0);
    expect(FX_BY_SEASON.summer).toBeNull();
    expect(FX_BY_SEASON.winter!.count).toBeGreaterThan(FX_BY_SEASON.autumn!.count);
  });
});
