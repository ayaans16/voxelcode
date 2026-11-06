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

/** Cherry blossom: a gently leaning trunk and a wide, airy, pink canopy with blossom flecks. */
export function generateCherry({ rng, height, radius, difficulty }: GeneratorParams): RawVoxel[] {
  const b = new Builder();
  const trunkTop = Math.round(height * 0.6);

  let x = 0;
  let z = 0;
  b.add(0, 0, 0, "trunk");
  const trunkPath: Vec[] = [[0, 0, 0]];
  for (let y = 1; y <= trunkTop; y++) {
    if (y % 3 === 0 && rng() < 0.5) {
      if (rng() < 0.5) x += rng() < 0.5 ? -1 : 1;
      else z += rng() < 0.5 ? -1 : 1;
      b.add(x, y - 1, z, "trunk");
    }
    b.add(x, y, z, "trunk");
    trunkPath.push([x, y, z]);
  }

  const count = difficulty === "easy" ? 4 : difficulty === "medium" ? 6 : 8;
  const phase = rng() * Math.PI * 2;
  const tips: Vec[] = [trunkPath[trunkPath.length - 1]!];
  for (let i = 0; i < count; i++) {
    const angle = phase + (i / count) * Math.PI * 2 + randRange(rng, -0.3, 0.3);
    const startIdx = Math.floor(trunkPath.length * randRange(rng, 0.55, 1));
    const start = trunkPath[Math.min(startIdx, trunkPath.length - 1)]!;
    const path = walkBranch(
      b,
      start,
      dirFromAngle(angle, randRange(rng, 0.4, 0.9)),
      radius * randRange(rng, 0.6, 0.95),
      { type: "branch", gravity: 0.03 },
    );
    tips.push(path[path.length - 1]!);
    if (path.length > 4) tips.push(path[Math.floor(path.length / 2)]!);
  }

  const rs = difficulty === "easy" ? 2.2 : difficulty === "medium" ? 2.8 : 3.2;
  const shapes: Shape[] = tips.map((t, i) =>
    ellipsoid(3000 + i, t[0], t[1] + 0.5, t[2], rs, rs * 0.8, rs, 0.35),
  );
  growLeaves(b, rng, anyOf(shapes), {
    density: 0.68,
    score: (_x, y) => y * 0.8,
    jitter: 1.2,
    type: (r) => (r() < 0.3 ? "blossom" : "leaf"),
  });
  return b.voxels;
}
