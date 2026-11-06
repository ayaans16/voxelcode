import type { GeneratorParams, RawVoxel } from "../types";
import { Builder, anyOf, ellipsoid, growLeaves, type Shape, type Vec } from "./kit";
import { pick, randInt, randRange } from "../prng";

/** Bamboo: a row of thin culms joined by a rhizome at ground level, with leafy tufts near the tops. */
export function generateBamboo({ rng, height, radius }: GeneratorParams): RawVoxel[] {
  const b = new Builder();
  const culmCount = 2 * radius + 1;

  // Rhizome: a wandering ground-level path. Every culm rises from it, so all stay connected.
  const bases: Vec[] = [];
  let z = 0;
  for (let i = 0; i < culmCount; i++) {
    const x = 2 * i - (culmCount - 1);
    if (rng() < 0.35) z += pick(rng, [-1, 1]);
    z = Math.max(-1, Math.min(1, z));
    bases.push([x, 0, z]);
  }
  let prev: Vec | undefined;
  for (const base of bases) {
    if (prev) b.line(prev, base, "trunk");
    else b.add(base[0], 0, base[2], "trunk");
    prev = base;
  }

  // Culms: straight poles, base to top.
  const heights = bases.map(() => Math.round(height * randRange(rng, 0.75, 1.1)));
  bases.forEach((base, i) => {
    for (let y = 1; y <= heights[i]!; y++) b.add(base[0], y, base[2], "trunk");
  });

  // Short side shoots near the top of each culm; their tips carry the leaf tufts.
  const tips: Vec[] = [];
  bases.forEach((base, i) => {
    const top = heights[i]!;
    tips.push([base[0], top, base[2]]);
    for (let y = Math.floor(top * 0.55); y < top; y += 3) {
      const dir = pick(rng, [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ] as const);
      const len = randInt(rng, 1, 2);
      const end: Vec = [base[0] + dir[0] * len, y, base[2] + dir[1] * len];
      b.line([base[0], y, base[2]], end, "branch");
      tips.push(end);
    }
  });

  const shapes: Shape[] = tips.map((t, i) =>
    ellipsoid(1000 + i, t[0], t[1], t[2], 1.7, 1.3, 1.7),
  );
  growLeaves(b, rng, anyOf(shapes), { density: 0.8, score: (_x, y) => y * 0.6 });
  return b.voxels;
}
