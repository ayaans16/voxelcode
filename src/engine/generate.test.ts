import { describe, expect, it } from "vitest";
import { SIZE_BOUNDS } from "./constants";
import { generateTree, treeBounds } from "./generate";
import { NEIGHBORS, cellKey } from "./generators/kit";
import { SPECIES_IDS, getSpecies } from "./species";
import { DIFFICULTIES, type Difficulty, type SpeciesId, type Voxel } from "./types";
import { seedFromSlug } from "./prng";

const SEEDS = Array.from({ length: 12 }, (_, i) => seedFromSlug(`problem-${i}`));
const combos: [SpeciesId, Difficulty][] = SPECIES_IDS.flatMap((s) => DIFFICULTIES.map((d) => [s, d] as [SpeciesId, Difficulty]));

function noFloating(voxels: readonly Voxel[]): number {
  const seen = new Set<number>();
  let bad = 0;
  voxels.forEach((v, i) => {
    if (i > 0 && !NEIGHBORS.some(([dx, dy, dz]) => seen.has(cellKey(v.x + dx, v.y + dy, v.z + dz)))) bad++;
    seen.add(cellKey(v.x, v.y, v.z));
  });
  return bad;
}

describe.each(combos)("%s / %s", (species, difficulty) => {
  it("is deterministic", () => {
    for (const seed of SEEDS.slice(0, 4)) {
      expect(generateTree({ seed, species, difficulty })).toEqual(generateTree({ seed, species, difficulty }));
    }
  });

  it("varies with the seed", () => {
    const a = generateTree({ seed: SEEDS[0]!, species, difficulty });
    const b = generateTree({ seed: SEEDS[1]!, species, difficulty });
    expect(a).not.toEqual(b);
  });

  it("assigns sequential growth indices with unique positions", () => {
    const v = generateTree({ seed: SEEDS[2]!, species, difficulty });
    v.forEach((vox, i) => expect(vox.growthIndex).toBe(i));
    expect(new Set(v.map((p) => cellKey(p.x, p.y, p.z))).size).toBe(v.length);
  });

  it("has no floating voxels (each touches an earlier one)", () => {
    for (const seed of SEEDS) {
      expect(noFloating(generateTree({ seed, species, difficulty }))).toBe(0);
    }
  });

  it("starts on the ground and never goes underground", () => {
    for (const seed of SEEDS) {
      const v = generateTree({ seed, species, difficulty });
      expect(v[0]!.y).toBe(0);
      expect(Math.min(...v.map((p) => p.y))).toBeGreaterThanOrEqual(0);
    }
  });

  it("grows trunk, then branches, then leaves", () => {
    for (const seed of SEEDS) {
      const v = generateTree({ seed, species, difficulty });
      const rank = { trunk: 0, branch: 1, leaf: 2, blossom: 2, golden: 2 } as const;
      for (let i = 1; i < v.length; i++) {
        expect(rank[v[i]!.type]).toBeGreaterThanOrEqual(rank[v[i - 1]!.type]);
      }
      expect(v.some((p) => p.type === "trunk")).toBe(true);
      expect(v.some((p) => p.type === "leaf")).toBe(true);
    }
  });

  it("stays inside the size bounds for its difficulty", () => {
    const { min, max } = SIZE_BOUNDS[difficulty];
    for (const seed of SEEDS) {
      const n = generateTree({ seed, species, difficulty }).length;
      expect(n).toBeGreaterThanOrEqual(min);
      expect(n).toBeLessThanOrEqual(max);
    }
  });

  it("only hard trees get a blossom crown on top", () => {
    const v = generateTree({ seed: SEEDS[3]!, species, difficulty });
    if (species === "cherry") return; // cherry grows blossoms everywhere
    const crown = v.some((p) => p.type === "blossom");
    expect(crown).toBe(difficulty === "hard");
  });
});

describe("difficulty ordering", () => {
  it.each(SPECIES_IDS)("%s: harder trees are bigger and taller on average", (species) => {
    const avg = (d: Difficulty) => {
      const trees = SEEDS.map((seed) => generateTree({ seed, species, difficulty: d }));
      const n = trees.reduce((s, t) => s + t.length, 0) / trees.length;
      const h = trees.reduce((s, t) => s + (treeBounds(t).maxY + 1), 0) / trees.length;
      return { n, h };
    };
    const e = avg("easy");
    const m = avg("medium");
    const h = avg("hard");
    expect(m.n).toBeGreaterThan(e.n);
    expect(h.n).toBeGreaterThan(m.n);
    expect(m.h).toBeGreaterThanOrEqual(e.h);
    expect(h.h).toBeGreaterThanOrEqual(m.h);
  });
});

describe("species silhouettes", () => {
  const dims = (species: SpeciesId, d: Difficulty = "medium") => {
    const b = treeBounds(generateTree({ seed: SEEDS[5]!, species, difficulty: d }));
    return { h: b.maxY - b.minY + 1, w: Math.max(b.maxX - b.minX, b.maxZ - b.minZ) + 1 };
  };
  it("pine and cypress are taller than wide", () => {
    for (const s of ["pine", "cypress"] as const) {
      const { h, w } = dims(s);
      expect(h).toBeGreaterThan(w);
    }
  });
  it("banyan is wider than tall", () => {
    const { h, w } = dims("banyan");
    expect(w).toBeGreaterThan(h);
  });
  it("every species has a palette and dimensions for all difficulties", () => {
    for (const id of SPECIES_IDS) {
      const s = getSpecies(id);
      for (const d of DIFFICULTIES) expect(s.dims[d].height).toBeGreaterThan(0);
      expect(Object.keys(s.palette).sort()).toEqual(["blossom", "branch", "golden", "leaf", "trunk"]);
    }
  });
});
