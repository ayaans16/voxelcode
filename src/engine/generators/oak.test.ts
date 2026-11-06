/**
 * ACCEPTANCE TESTS FOR YOUR OAK (see the TODO in oak.ts).
 *
 * They are skipped while OAK_IMPLEMENTED is false so CI stays green with the
 * placeholder oak. When you finish your generator, set OAK_IMPLEMENTED = true
 * in oak.ts and make these pass. (The generic tests in ../generate.test.ts
 * - determinism, no floating voxels, size bounds, phase order - always run.)
 */
import { describe, expect, it } from "vitest";
import { OAK_IMPLEMENTED } from "./oak";
import { generateTree, treeBounds } from "../generate";
import { NEIGHBORS, cellKey } from "./kit";
import { DIFFICULTIES } from "../types";

const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8];
const woodNeighbors = (set: Set<number>, v: { x: number; y: number; z: number }) =>
  NEIGHBORS.filter(([dx, dy, dz]) => set.has(cellKey(v.x + dx, v.y + dy, v.z + dz)));

describe.skipIf(!OAK_IMPLEMENTED)("oak (your implementation)", () => {
  it.each(DIFFICULTIES)("%s: branches actually split (at least 3 fork points)", (difficulty) => {
    for (const seed of SEEDS) {
      const tree = generateTree({ seed, species: "oak", difficulty });
      const wood = tree.filter((v) => v.type === "trunk" || v.type === "branch");
      const woodSet = new Set(wood.map((v) => cellKey(v.x, v.y, v.z)));
      // A fork: a branch voxel that touches 3+ other wood voxels (parent + 2 children).
      const forks = tree.filter((v) => v.type === "branch" && woodNeighbors(woodSet, v).length >= 3);
      expect(forks.length).toBeGreaterThanOrEqual(difficulty === "easy" ? 1 : 3);
    }
  });

  it("branches grow from their base outward: each branch voxel touches an EARLIER wood voxel", () => {
    for (const seed of SEEDS) {
      const tree = generateTree({ seed, species: "oak", difficulty: "medium" });
      const seen = new Set<number>();
      for (const v of tree) {
        if (v.type === "branch") {
          const touchesEarlierWood = NEIGHBORS.some(([dx, dy, dz]) => seen.has(cellKey(v.x + dx, v.y + dy, v.z + dz)));
          expect(touchesEarlierWood).toBe(true);
        }
        if (v.type === "trunk" || v.type === "branch") seen.add(cellKey(v.x, v.y, v.z));
      }
    }
  });

  it("the trunk rises base to top (y never decreases while emitting trunk voxels)", () => {
    const tree = generateTree({ seed: 3, species: "oak", difficulty: "medium" });
    const trunk = tree.filter((v) => v.type === "trunk");
    for (let i = 1; i < trunk.length; i++) expect(trunk[i]!.y).toBeGreaterThanOrEqual(trunk[i - 1]!.y);
  });

  it("the canopy is wider than the trunk is tall (a spreading oak, not a spire)", () => {
    for (const seed of SEEDS) {
      const tree = generateTree({ seed, species: "oak", difficulty: "medium" });
      const b = treeBounds(tree);
      const width = Math.max(b.maxX - b.minX, b.maxZ - b.minZ) + 1;
      const trunkTop = Math.max(...tree.filter((v) => v.type === "trunk").map((v) => v.y));
      expect(width).toBeGreaterThan(trunkTop);
    }
  });

  it("leaves hug the wood: every leaf is within 3 cells of a branch or trunk voxel", () => {
    const tree = generateTree({ seed: 9, species: "oak", difficulty: "medium" });
    const wood = tree.filter((v) => v.type === "trunk" || v.type === "branch");
    for (const leaf of tree.filter((v) => v.type === "leaf")) {
      const near = wood.some((w) => Math.abs(w.x - leaf.x) + Math.abs(w.y - leaf.y) + Math.abs(w.z - leaf.z) <= 6);
      expect(near).toBe(true);
    }
  });
});

describe("oak placeholder", () => {
  it("exists and produces a tree (so the rest of the app can draw an oak)", () => {
    expect(generateTree({ seed: 1, species: "oak", difficulty: "medium" }).length).toBeGreaterThan(50);
  });
});
