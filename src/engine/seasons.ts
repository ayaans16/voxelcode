/**
 * Seasonal themes for trees. Pure: only numbers in, numbers out.
 * A season changes COLORS only, never voxel positions or counts, so growth and
 * every engine guarantee are untouched.
 */
import { cellNoise } from "./prng";
import type { Palette, VoxelType } from "./types";

export const SEASONS = ["spring", "summer", "autumn", "winter"] as const;
export type Season = (typeof SEASONS)[number];
export type SeasonSetting = Season | "auto";

export const SEASON_LABELS: Record<Season, string> = {
  spring: "Spring",
  summer: "Summer",
  autumn: "Autumn",
  winter: "Winter",
};

/** Northern-hemisphere meteorological seasons. */
export function seasonForDate(date: Date): Season {
  const m = date.getMonth(); // 0 = January
  if (m >= 2 && m <= 4) return "spring";
  if (m >= 5 && m <= 7) return "summer";
  if (m >= 8 && m <= 10) return "autumn";
  return "winter";
}

export function resolveSeason(setting: SeasonSetting, date: Date): Season {
  return setting === "auto" ? seasonForDate(date) : setting;
}

function mix(a: number, b: number, t: number): number {
  const ch = (shift: number) => {
    const x = (a >> shift) & 255;
    const y = (b >> shift) & 255;
    return Math.round(x + (y - x) * t) << shift;
  };
  return ch(16) | ch(8) | ch(0);
}

const AUTUMN = [0xe0a93a, 0xd2692a, 0xb23a2a, 0xc98a2e];
const SPRING_LEAF = 0xa8e070;
const SPRING_PETAL = 0xf7c6d9;
const SNOW = 0xf2f6fa;
const ICE = 0xcfe3f2;

/**
 * The color a voxel gets in a season, before the per-voxel brightness shade.
 * `evergreen` trees (pine, cypress, bamboo) keep their needles and just
 * gain snow in winter or a lighter tip in spring.
 */
export function seasonalColor(
  season: Season,
  type: VoxelType,
  palette: Palette,
  evergreen: boolean,
  x: number,
  y: number,
  z: number,
): number {
  const n = cellNoise(31, x, y, z);
  const base = palette[type];
  if (type === "trunk" || type === "branch" || type === "golden") {
    if (season === "winter" && type !== "golden") return mix(base, 0xcdd6dd, type === "branch" ? 0.35 : 0.15);
    return base;
  }
  switch (season) {
    case "summer":
      return base;
    case "spring": {
      if (type === "blossom") return 0xffeef4;
      if (evergreen) return mix(base, SPRING_LEAF, 0.35);
      return n < 0.22 ? SPRING_PETAL : mix(base, SPRING_LEAF, 0.65);
    }
    case "autumn": {
      if (type === "blossom") return 0xf0c060;
      if (evergreen) return mix(base, 0x6b7a2c, 0.25);
      return AUTUMN[Math.floor(n * AUTUMN.length) % AUTUMN.length]!;
    }
    case "winter": {
      if (type === "blossom") return 0xffffff;
      if (evergreen) return n < 0.5 ? SNOW : mix(base, 0x1c4a3a, 0.2);
      return n < 0.72 ? SNOW : ICE;
    }
  }
}

export interface GroundColors {
  grass: readonly number[];
  dirt: readonly number[];
  stone: number;
}

export const GROUND_BY_SEASON: Record<Season, GroundColors> = {
  spring: { grass: [0x7fcf5a, 0x74c452, 0x8ad964], dirt: [0x7a5a3c, 0x6e5035], stone: 0x5a5750 },
  summer: { grass: [0x6fae4a, 0x66a444, 0x78b852], dirt: [0x7a5a3c, 0x6e5035], stone: 0x55524d },
  autumn: { grass: [0xb8893a, 0xa97a33, 0xc59a48], dirt: [0x6b4c30, 0x5f4229], stone: 0x4f4a44 },
  winter: { grass: [0xf3f7fb, 0xe4edf5, 0xffffff], dirt: [0x6e5035, 0x5f4229], stone: 0x5a6068 },
};

export interface FxStyle {
  count: number;
  colors: readonly number[];
  /** Fall speed in voxels per second. */
  speed: [number, number];
  size: [number, number];
  sway: number;
}

/** Ambient falling particles per season (summer has none). */
export const FX_BY_SEASON: Record<Season, FxStyle | null> = {
  spring: { count: 40, colors: [0xf7c6d9, 0xffeef4, 0xf2a9c4], speed: [0.8, 1.6], size: [0.28, 0.42], sway: 1.4 },
  summer: null,
  autumn: { count: 46, colors: [0xe0a93a, 0xd2692a, 0xb23a2a], speed: [1.2, 2.4], size: [0.32, 0.5], sway: 1.8 },
  winter: { count: 90, colors: [0xffffff, 0xe6f0fa], speed: [1.6, 3.0], size: [0.22, 0.36], sway: 0.9 },
};
