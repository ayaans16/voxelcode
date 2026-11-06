import type { GeneratorParams, RawVoxel } from "../types";
import { Builder, growLeaves, type Shape } from "./kit";
import { randRange } from "../prng";

interface Tier {
  y: number;
  r: number;
}

/** Tall tiered pine: a straight trunk with flat layered discs that shrink toward the top. */
export function generatePine({ rng, height, radius }: GeneratorParams): RawVoxel[] {
  const b = new Builder();
  for (let y = 0; y < height; y++) b.add(0, y, 0, "trunk");

  const baseY = Math.max(2, Math.round(height * 0.22));
  const spacing = height < 10 ? 2 : 3;
  const tiers: Tier[] = [];
  for (let y = baseY; y <= height - 2; y += spacing) {
    const t = (y - baseY) / Math.max(1, height - baseY);
    tiers.push({ y, r: Math.max(1, Math.round(radius * (1 - t * 0.9))) });
  }

  // Spokes: evenly spaced around the trunk with a little angular jitter.
  for (const tier of tiers) {
    const spokes = tier.r >= 3 ? 8 : 4;
    const phase = rng() * Math.PI;
    for (let i = 0; i < spokes; i++) {
      const angle = phase + (i / spokes) * Math.PI * 2 + randRange(rng, -0.12, 0.12);
      const end: [number, number, number] = [
        Math.round(Math.cos(angle) * tier.r),
        tier.y,
        Math.round(Math.sin(angle) * tier.r),
      ];
      b.line([0, tier.y, 0], end, "branch");
    }
  }

  const inShape: Shape = (x, y, z) => {
    if (x === 0 && z === 0 && y === height) return true; // apex
    const d = Math.hypot(x, z);
    for (const t of tiers) {
      if (y === t.y && d <= t.r + 0.4) return true;
      if (y === t.y - 1 && d <= t.r + 0.4 && d >= t.r - 1.6) return true;
      if (y === t.y + 1 && d <= t.r - 1.5) return true;
    }
    return false;
  };
  growLeaves(b, rng, inShape, { density: 0.93, score: (_x, y) => y, jitter: 0.6 });
  return b.voxels;
}
