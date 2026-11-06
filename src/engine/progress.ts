/**
 * Progress math. Pure functions over a small state record.
 *
 * Design:
 *  - Each source (open, checkpoint, visible tests, hidden tests) contributes
 *    a bounded amount. Visible/hidden track the BEST fraction ever reached,
 *    so retrying a worse run can never shrink anything.
 *  - Hidden tests fill "the rest" of the bar: hidden contribution =
 *    fraction * (1 - everything else earned). A full hidden pass therefore
 *    always lands on exactly 1.0, even if the optional checkpoint was skipped.
 *  - `progress` itself is also ratcheted with max(), as a belt-and-braces guard.
 */
import { DEFAULT_GROWTH, FALLBACK_MEDIAN_SECONDS, MIN_SOLVES_FOR_MEDIAN, type GrowthConstants } from "./constants";
import { mulberry32 } from "./prng";
import type { Difficulty, Voxel } from "./types";

export type CheckpointResult = "none" | "correct" | "wrong";

export interface ProgressState {
  opened: boolean;
  checkpoint: CheckpointResult;
  /** Best fraction of visible tests ever passing (0..1). */
  visibleBest: number;
  /** Best fraction of hidden tests ever passing (0..1). */
  hiddenBest: number;
  /** Ratcheted overall progress (0..1). */
  progress: number;
}

export function initialProgressState(): ProgressState {
  return { opened: false, checkpoint: "none", visibleBest: 0, hiddenBest: 0, progress: 0 };
}

const clamp01 = (v: number) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0);

export function fractionPassing(passed: number, total: number): number {
  if (total <= 0) return 0;
  return clamp01(passed / total);
}

/** Pure function: state -> raw progress (no ratchet). */
export function computeProgress(state: ProgressState, c: GrowthConstants = DEFAULT_GROWTH): number {
  const open = state.opened ? c.opened : 0;
  const checkpoint =
    state.checkpoint === "correct" ? c.checkpointCorrect : state.checkpoint === "wrong" ? c.checkpointWrong : 0;
  const visible = c.visibleMax * clamp01(state.visibleBest);
  const base = open + checkpoint + visible;
  const hidden = clamp01(state.hiddenBest) * (1 - base);
  return clamp01(base + hidden);
}

function withRatchet(state: ProgressState, c: GrowthConstants): ProgressState {
  return { ...state, progress: Math.max(state.progress, computeProgress(state, c)) };
}

export function openProblem(state: ProgressState, c: GrowthConstants = DEFAULT_GROWTH): ProgressState {
  return withRatchet({ ...state, opened: true }, c);
}

/** Only the FIRST checkpoint answer counts, so it cannot be retried for more growth. */
export function answerCheckpoint(
  state: ProgressState,
  correct: boolean,
  c: GrowthConstants = DEFAULT_GROWTH,
): ProgressState {
  if (state.checkpoint !== "none") return state;
  return withRatchet({ ...state, checkpoint: correct ? "correct" : "wrong" }, c);
}

export function recordVisibleRun(
  state: ProgressState,
  passed: number,
  total: number,
  c: GrowthConstants = DEFAULT_GROWTH,
): ProgressState {
  return withRatchet({ ...state, visibleBest: Math.max(state.visibleBest, fractionPassing(passed, total)) }, c);
}

export function recordHiddenRun(
  state: ProgressState,
  passed: number,
  total: number,
  c: GrowthConstants = DEFAULT_GROWTH,
): ProgressState {
  return withRatchet({ ...state, hiddenBest: Math.max(state.hiddenBest, fractionPassing(passed, total)) }, c);
}

export function isComplete(state: ProgressState): boolean {
  return state.progress >= 1;
}

// ---------------------------------------------------------------------------
// Accents: cosmetic bonuses. They recolor existing leaves; they never add or
// remove voxels, so they cannot change growth.
// ---------------------------------------------------------------------------

export interface AccentInput {
  /** The very first submission passed every hidden test. */
  firstTryFullPass: boolean;
  hintsUsed: number;
  /** Active seconds spent until the solve. */
  solveSeconds: number;
  /** Median active seconds of the user's past solves at this difficulty (undefined = unknown). */
  medianSeconds: number | undefined;
  difficulty: Difficulty;
}

export interface Accents {
  /** Fraction of leaves that turn golden. */
  golden: number;
  /** Fraction of leaves that become extra blossoms. */
  blossom: number;
}

export function computeAccents(input: AccentInput, c: GrowthConstants = DEFAULT_GROWTH): Accents {
  // Hints only ever reduce the golden bonus (never growth).
  const hintFactor = Math.max(0, 1 - Math.max(0, input.hintsUsed) * c.hintPenalty);
  const golden = input.firstTryFullPass ? c.goldenMax * hintFactor : 0;

  const median = input.medianSeconds ?? FALLBACK_MEDIAN_SECONDS[input.difficulty];
  let blossom = 0;
  if (median > 0 && input.solveSeconds > 0 && input.solveSeconds < median) {
    const faster = 1 - input.solveSeconds / median; // 0..1
    blossom = c.blossomMax * Math.min(1, faster * 2);
  }
  return { golden, blossom };
}

/** Median of a list of numbers, or undefined if there are fewer than MIN_SOLVES_FOR_MEDIAN. */
export function medianSolveSeconds(samples: readonly number[]): number | undefined {
  if (samples.length < MIN_SOLVES_FOR_MEDIAN) return undefined;
  const s = samples.slice().sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[mid - 1]! + s[mid]!) / 2 : s[mid]!;
}

/** Recolors a deterministic subset of leaves as golden / blossom. Positions and order are untouched. */
export function applyAccents(voxels: readonly Voxel[], accents: Accents, seed: number): Voxel[] {
  const leafIdx: number[] = [];
  voxels.forEach((v, i) => {
    if (v.type === "leaf") leafIdx.push(i);
  });
  const rng = mulberry32(seed ^ 0x51ed270b);
  for (let i = leafIdx.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const a = leafIdx[i]!;
    leafIdx[i] = leafIdx[j]!;
    leafIdx[j] = a;
  }
  const goldenCount = Math.round(accents.golden * leafIdx.length);
  const blossomCount = Math.round(accents.blossom * leafIdx.length);
  const out = voxels.slice();
  leafIdx.slice(0, goldenCount).forEach((i) => (out[i] = { ...out[i]!, type: "golden" }));
  leafIdx.slice(goldenCount, goldenCount + blossomCount).forEach((i) => (out[i] = { ...out[i]!, type: "blossom" }));
  return out;
}
