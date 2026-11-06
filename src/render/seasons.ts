import { cellNoise } from "@/engine/prng";
import type { Palette, VoxelType } from "@/engine/types";
import { seasonalColor, type Season } from "@/engine/seasons";
import { lerpColor } from "./daynight";

const AUTUMN_GOLD = 0xe0a93a;
const AUTUMN_AMBER = 0xcf6f2a;

/**
 * Final color for a voxel. The season picks the base hue (see engine/seasons.ts).
 * In summer only, `autumn` (0..1, from the streak) pushes leaves toward gold:
 * a broken streak simply returns it to 0. Golden accents are never tinted.
 * Each voxel gets a small deterministic brightness variation so large surfaces do not look flat.
 */
export function voxelColor(
  type: VoxelType,
  palette: Palette,
  autumn: number,
  x: number,
  y: number,
  z: number,
  season: Season = "summer",
  evergreen = false,
): number {
  let color = seasonalColor(season, type, palette, evergreen, x, y, z);
  const n = cellNoise(7, x, y, z);
  if (type === "leaf" && autumn > 0 && season === "summer") {
    const target = lerpColor(AUTUMN_GOLD, AUTUMN_AMBER, n);
    color = lerpColor(color, target, autumn * (0.75 + 0.25 * n));
  }
  // Snow stays bright: less shading in winter.
  const shade = season === "winter" ? 0.97 + 0.06 * n : 0.92 + 0.16 * n;
  return scale(color, shade);
}

function scale(c: number, k: number): number {
  const r = Math.min(255, Math.round(((c >> 16) & 255) * k));
  const g = Math.min(255, Math.round(((c >> 8) & 255) * k));
  const b = Math.min(255, Math.round((c & 255) * k));
  return (r << 16) | (g << 8) | b;
}
