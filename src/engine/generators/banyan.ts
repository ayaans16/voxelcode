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
import { randRange } from "../prng";

/** Banyan: a thick short trunk, long near-horizontal limbs, and aerial roots dropping to the ground. */
export function generateBanyan({ rng, height, radius, difficulty }: GeneratorParams): RawVoxel[] {
  const b = new Builder();
  const thickTop = Math.round(height * 0.5);
  const trunkTop = Math.round(height * 0.65);

  // Trunk, layer by layer: a 2x2 base that narrows to a single column.
  for (let y = 0; y <= trunkTop; y++) {
    b.add(0, y, 0, "trunk");
    if (y <= thickTop) {
      b.add(1, y, 0, "trunk");
      b.add(0, y, 1, "trunk");
      b.add(1, y, 1, "trunk");
    }
  }

  const limbs = difficulty === "easy" ? 4 : difficulty === "medium" ? 6 : 8;
  const rootsPerLimb = difficulty === "easy" ? 1 : difficulty === "medium" ? 2 : 3;
  const phase = rng() * Math.PI * 2;
  const paths: Vec[][] = [];
  for (let i = 0; i < limbs; i++) {
    const angle = phase + (i / limbs) * Math.PI * 2 + randRange(rng, -0.2, 0.2);
    const startY = Math.round(randRange(rng, thickTop, trunkTop));
    paths.push(
      walkBranch(b, [0, startY, 0], dirFromAngle(angle, randRange(rng, 0.15, 0.4)), radius * randRange(rng, 0.8, 1.05), {
        type: "branch",
        gravity: 0.015,
        minY: thickTop,
      }),
    );
  }

  // Aerial roots hang from the outer half of each limb.
  for (const path of paths) {
    const lo = Math.floor(path.length * 0.4);
    for (let r = 0; r < rootsPerLimb; r++) {
      const idx = Math.min(path.length - 1, lo + Math.floor(((r + 0.5) / rootsPerLimb) * (path.length - lo)));
      const [rx, ry, rz] = path[idx]!;
      for (let y = ry - 1; y >= 0; y--) b.add(rx, y, rz, "branch");
    }
  }

  // Broad, flat crown plus blobs at the limb tips.
  const crownY = trunkTop + 1;
  const shapes: Shape[] = [ellipsoid(4000, 0, crownY, 0, radius * 0.95, Math.max(2.5, height * 0.2), radius * 0.95, 0.35)];
  paths.forEach((p, i) => {
    const tip = p[p.length - 1]!;
    shapes.push(ellipsoid(4100 + i, tip[0], tip[1] + 0.5, tip[2], 2.8, 2.2, 2.8));
  });
  growLeaves(b, rng, anyOf(shapes), { density: 0.5, score: (_x, y) => y * 0.7, jitter: 1.5 });
  return b.voxels;
}
