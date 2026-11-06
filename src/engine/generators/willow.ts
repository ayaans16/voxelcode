import type { GeneratorParams, RawVoxel } from "../types";
import {
  Builder,
  anyOf,
  dirFromAngle,
  ellipsoid,
  growLeaves,
  walkBranch,
  type Shape,
  type Vec,
} from "./kit";
import { randInt, randRange } from "../prng";

export interface WillowStyle {
  /** How hard the main branches arch over. */
  gravity: number;
  /** Min and max hanging strand length. */
  strand: [number, number];
}

export const WILLOW_STYLE: WillowStyle = { gravity: 0.09, strand: [2, 4] };
export const WEEPING_WILLOW_STYLE: WillowStyle = { gravity: 0.13, strand: [4, 9] };

/** Willow family: a leaning trunk, arching branches, and curtains of hanging leaf strands. */
export function makeWillowGenerator(style: WillowStyle) {
  return function generateWillow({ rng, height, radius, difficulty }: GeneratorParams): RawVoxel[] {
    const b = new Builder();

    // Trunk: wanders by at most one voxel every few steps.
    const trunkTop = Math.round(height * 0.55);
    let x = 0;
    let z = 0;
    b.add(0, 0, 0, "trunk");
    const trunkPath: Vec[] = [[0, 0, 0]];
    for (let y = 1; y <= trunkTop; y++) {
      if (y % 3 === 0 && rng() < 0.6) {
        if (rng() < 0.5) x += rng() < 0.5 ? -1 : 1;
        else z += rng() < 0.5 ? -1 : 1;
        b.add(x, y - 1, z, "trunk");
      }
      b.add(x, y, z, "trunk");
      trunkPath.push([x, y, z]);
    }

    // Main branches radiate from the crown and arch outward.
    const branchCount = difficulty === "easy" ? 4 : difficulty === "medium" ? 5 : 7;
    const phase = rng() * Math.PI * 2;
    const arches: Vec[][] = [];
    for (let i = 0; i < branchCount; i++) {
      const angle = phase + (i / branchCount) * Math.PI * 2 + randRange(rng, -0.25, 0.25);
      const startIdx = Math.max(1, trunkPath.length - 1 - randInt(rng, 0, 2));
      const start = trunkPath[startIdx]!;
      const path = walkBranch(
        b,
        start,
        dirFromAngle(angle, randRange(rng, 0.7, 1.0)),
        radius * randRange(rng, 1.0, 1.25),
        { type: "branch", gravity: style.gravity, minY: Math.round(height * 0.35) },
      );
      arches.push(path);
    }

    // Leaf caps along the branches, then the hanging strands.
    const capShapes: Shape[] = [];
    arches.forEach((path, i) => {
      path.forEach((p, j) => {
        if (j % 4 === 0) capShapes.push(ellipsoid(2000 + i * 100 + j, p[0], p[1], p[2], 1.5, 1.1, 1.5));
      });
    });
    growLeaves(b, rng, anyOf(capShapes), { density: 0.75, score: (_x, y) => y });

    const starts: Vec[] = [];
    for (const path of arches) {
      const from = Math.floor(path.length * 0.3);
      for (let j = from; j < path.length; j++) starts.push(path[j]!);
    }
    // Lowest anchors first so curtains unfold from the bottom up.
    const ordered = starts
      .map((p) => ({ p, k: p[1] + rng() * 0.5 }))
      .sort((a, c) => a.k - c.k)
      .map((e) => e.p);
    for (const [sx, sy, sz] of ordered) {
      const len = randInt(rng, style.strand[0], style.strand[1]);
      for (let d = 1; d <= len && sy - d >= 1; d++) b.add(sx, sy - d, sz, "leaf");
    }
    return b.voxels;
  };
}
