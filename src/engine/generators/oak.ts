import type { GeneratorParams, RawVoxel } from "../types";
import { Builder, ellipsoid, growLeaves } from "./kit";

/**
 * =====================================================================
 *  TODO (yours): implement the oak's tree generation algorithm.
 * =====================================================================
 *
 * The code below is a deliberately plain PLACEHOLDER (a straight trunk
 * with one round blob on top) so the rest of the app has an oak to draw.
 * Replace it with the real thing, then flip OAK_IMPLEMENTED to true so the
 * oak acceptance tests in oak.test.ts start running.
 *
 * Contract (the generic tests in generate.test.ts already enforce the first
 * five; oak.test.ts adds the algorithm-specific ones):
 *
 *   1. Return voxels IN ORDER OF APPEARANCE. Index = growth order.
 *   2. Every voxel except the first must share a face with an EARLIER voxel
 *      (no floating voxels). `Builder.add` throws if you break this.
 *   3. All voxels have y >= 0 and the first voxel sits on the ground (y = 0).
 *   4. Same `rng` stream => same tree (only use `params.rng`, never Math.random).
 *   5. Voxel count must fit SIZE_BOUNDS for the difficulty (constants.ts).
 *   6. Phase order: all "trunk", then all "branch", then all "leaf".
 *   7. (oak.test.ts) Branches must SPLIT: at least `minForks` branch voxels
 *      where the wood fans out into 2+ children, and the canopy must be wider
 *      than it is tall, like a real oak.
 *   8. (oak.test.ts) Within the branch phase, a limb's voxels appear from its
 *      base outward (parent before child), so animating by growthIndex looks
 *      like the tree really growing.
 *
 * Ideas to get you started (a recursive approach works nicely):
 *   - grow a trunk with `b.add` / `b.line` up to ~45% of params.height
 *   - recursive function `grow(start, dir, length, depth)`: walk a branch with
 *     `walkBranch`, then at its end (or midway) split into 2-3 children with
 *     jittered directions, shorter lengths and depth - 1
 *   - emit BREADTH-FIRST (all depth-1 limbs, then depth-2, ...) or finish each
 *     limb before its children; either keeps "parent before child"
 *   - finish with `growLeaves` using ellipsoid shapes around the branch tips
 *
 * Helpers live in ./kit.ts: Builder, walkBranch, linePoints, growLeaves,
 * ellipsoid, anyOf, dirFromAngle.
 */
export const OAK_IMPLEMENTED = false;

export function generateOak({ rng, height, radius }: GeneratorParams): RawVoxel[] {
  // ---- PLACEHOLDER START: replace everything below ----
  const b = new Builder();
  const trunkTop = Math.round(height * 0.5);
  for (let y = 0; y <= trunkTop; y++) b.add(0, y, 0, "trunk");
  // A few stubby "branches" so the phase order (trunk < branch < leaf) holds.
  b.line([0, trunkTop, 0], [2, trunkTop, 0], "branch");
  b.line([0, trunkTop, 0], [-2, trunkTop, 0], "branch");
  b.line([0, trunkTop, 0], [0, trunkTop, 2], "branch");
  b.line([0, trunkTop, 0], [0, trunkTop, -2], "branch");
  const canopy = ellipsoid(5000, 0, trunkTop + radius * 0.35, 0, radius, radius * 0.7, radius, 0.3);
  growLeaves(b, rng, canopy, { density: 0.55, score: (_x, y) => y, jitter: 1.2 });
  return b.voxels;
  // ---- PLACEHOLDER END ----
}
