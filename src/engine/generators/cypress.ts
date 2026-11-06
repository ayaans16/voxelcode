import type { GeneratorParams, RawVoxel } from "../types";
import { Builder, growLeaves, type Shape } from "./kit";

/** Cypress: a narrow, flame-shaped column with a pointed top. */
export function generateCypress({ rng, height, radius }: GeneratorParams): RawVoxel[] {
  const b = new Builder();
  for (let y = 0; y < height; y++) b.add(0, y, 0, "trunk");

  // Radius profile: swells to its widest around a third of the way up, then tapers to a point.
  const profile = (y: number): number => {
    const t = y / height;
    const k = t < 0.35 ? 0.55 + (0.45 * t) / 0.35 : 1 - Math.pow((t - 0.35) / 0.65, 1.4);
    return radius * Math.max(0, k);
  };

  // Short branch stubs that the foliage grows from.
  for (let y = 2; y < height - 1; y += 3) {
    const reach = Math.max(1, Math.round(profile(y) - 1));
    const offset = rng() < 0.5 ? 0 : 1;
    const dirs: [number, number][] = [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ];
    dirs.forEach(([dx, dz], i) => {
      if ((i + offset) % 2 === 0 || reach > 1) {
        b.line([0, y, 0], [dx * reach, y, dz * reach], "branch");
      }
    });
  }

  const inShape: Shape = (x, y, z) => {
    if (y < 2 || y > height) return false;
    return Math.hypot(x, z) <= profile(y) + 0.3;
  };
  growLeaves(b, rng, inShape, { density: 0.9, score: (_x, y) => y, jitter: 0.8 });
  return b.voxels;
}
