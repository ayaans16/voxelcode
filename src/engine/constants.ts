/**
 * Every tunable number of the growth engine lives here.
 * The /settings page lets the user override the GrowthConstants part;
 * sanitizeGrowthConstants() keeps any override inside safe bounds.
 */
import type { Difficulty } from "./types";

export interface GrowthConstants {
  /** Progress granted for opening a problem (planting the seed). */
  opened: number;
  /** Progress for a correct approach checkpoint. */
  checkpointCorrect: number;
  /** Progress for a wrong approach checkpoint (learning is still rewarded). */
  checkpointWrong: number;
  /** Max progress from visible tests (scaled by the fraction passing). */
  visibleMax: number;
  /** Max fraction of leaves that turn golden for a first-try full pass. */
  goldenMax: number;
  /** Each hint used removes this share of the golden bonus (never growth). */
  hintPenalty: number;
  /** Max fraction of leaves that become extra blossoms for a fast solve. */
  blossomMax: number;
  /** Streak length (days) at which leaves are fully autumn gold. */
  autumnFullStreak: number;
}

export const DEFAULT_GROWTH: GrowthConstants = {
  opened: 0.05,
  checkpointCorrect: 0.15,
  checkpointWrong: 0.08,
  visibleMax: 0.35,
  goldenMax: 0.2,
  hintPenalty: 0.25,
  blossomMax: 0.18,
  autumnFullStreak: 14,
};

/** Keep user overrides sane: numbers in range, and the fixed sources can never exceed 95%. */
export function sanitizeGrowthConstants(input: Partial<GrowthConstants>): GrowthConstants {
  const clamp = (v: number | undefined, lo: number, hi: number, fallback: number) =>
    typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback;
  const out: GrowthConstants = {
    opened: clamp(input.opened, 0, 0.2, DEFAULT_GROWTH.opened),
    checkpointCorrect: clamp(input.checkpointCorrect, 0, 0.4, DEFAULT_GROWTH.checkpointCorrect),
    checkpointWrong: clamp(input.checkpointWrong, 0, 0.4, DEFAULT_GROWTH.checkpointWrong),
    visibleMax: clamp(input.visibleMax, 0, 0.6, DEFAULT_GROWTH.visibleMax),
    goldenMax: clamp(input.goldenMax, 0, 0.5, DEFAULT_GROWTH.goldenMax),
    hintPenalty: clamp(input.hintPenalty, 0, 1, DEFAULT_GROWTH.hintPenalty),
    blossomMax: clamp(input.blossomMax, 0, 0.5, DEFAULT_GROWTH.blossomMax),
    autumnFullStreak: clamp(input.autumnFullStreak, 1, 365, DEFAULT_GROWTH.autumnFullStreak),
  };
  // A wrong checkpoint can never be worth more than a right one.
  out.checkpointWrong = Math.min(out.checkpointWrong, out.checkpointCorrect);
  const fixed = out.opened + out.checkpointCorrect + out.visibleMax;
  if (fixed > 0.95) {
    const k = 0.95 / fixed;
    out.opened *= k;
    out.checkpointCorrect *= k;
    out.checkpointWrong *= k;
    out.visibleMax *= k;
  }
  return out;
}

/** Allowed voxel counts per difficulty (including the hard-mode blossom crown). */
export const SIZE_BOUNDS: Record<Difficulty, { min: number; max: number }> = {
  easy: { min: 50, max: 320 },
  medium: { min: 150, max: 750 },
  hard: { min: 330, max: 1400 },
};

/** Used for the "faster than your median" bonus until enough solves exist. */
export const FALLBACK_MEDIAN_SECONDS: Record<Difficulty, number> = {
  easy: 10 * 60,
  medium: 25 * 60,
  hard: 45 * 60,
};

/** Minimum number of past solves before the user's own median is trusted. */
export const MIN_SOLVES_FOR_MEDIAN = 3;
