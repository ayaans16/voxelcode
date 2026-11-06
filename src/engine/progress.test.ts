import { describe, expect, it } from "vitest";
import { DEFAULT_GROWTH, sanitizeGrowthConstants } from "./constants";
import {
  answerCheckpoint,
  applyAccents,
  computeAccents,
  computeProgress,
  initialProgressState,
  isComplete,
  medianSolveSeconds,
  openProblem,
  recordHiddenRun,
  recordVisibleRun,
  type ProgressState,
} from "./progress";
import { generateTree } from "./generate";
import { mulberry32 } from "./prng";

const close = (a: number, b: number) => expect(a).toBeCloseTo(b, 10);

describe("progress sources", () => {
  it("starts at zero and opening gives +0.05", () => {
    expect(initialProgressState().progress).toBe(0);
    close(openProblem(initialProgressState()).progress, 0.05);
  });

  it("checkpoint: +0.15 correct, +0.08 wrong, only the first answer counts", () => {
    const opened = openProblem(initialProgressState());
    close(answerCheckpoint(opened, true).progress, 0.2);
    close(answerCheckpoint(opened, false).progress, 0.13);
    const wrongFirst = answerCheckpoint(opened, false);
    expect(answerCheckpoint(wrongFirst, true)).toBe(wrongFirst);
  });

  it("visible tests give up to +0.35, proportional to the fraction passing", () => {
    const opened = openProblem(initialProgressState());
    close(recordVisibleRun(opened, 1, 2).progress, 0.05 + 0.175);
    close(recordVisibleRun(opened, 2, 2).progress, 0.4);
  });

  it("hidden tests fill the rest up to exactly 1.0 on a full pass", () => {
    let s = openProblem(initialProgressState());
    s = recordVisibleRun(s, 3, 3);
    const half = recordHiddenRun(s, 1, 2);
    expect(half.progress).toBeGreaterThan(s.progress);
    expect(half.progress).toBeLessThan(1);
    const full = recordHiddenRun(s, 5, 5);
    expect(full.progress).toBe(1);
    expect(isComplete(full)).toBe(true);
  });

  it("a full hidden pass reaches 1.0 even if the optional checkpoint was skipped", () => {
    const s = recordHiddenRun(openProblem(initialProgressState()), 10, 10);
    expect(s.progress).toBe(1);
  });

  it("never exceeds 1 and ignores nonsense input", () => {
    let s = openProblem(initialProgressState());
    s = recordVisibleRun(s, 99, 3);
    s = recordHiddenRun(s, 99, 3);
    expect(s.progress).toBeLessThanOrEqual(1);
    expect(recordVisibleRun(initialProgressState(), 1, 0).visibleBest).toBe(0);
    expect(recordVisibleRun(initialProgressState(), NaN, 3).visibleBest).toBe(0);
  });
});

describe("monotonic growth (ratchet)", () => {
  it("a worse run after a better one never shrinks progress", () => {
    let s = openProblem(initialProgressState());
    s = recordVisibleRun(s, 3, 3);
    const before = s.progress;
    s = recordVisibleRun(s, 0, 3);
    expect(s.progress).toBe(before);
    s = recordHiddenRun(s, 4, 5);
    const mid = s.progress;
    s = recordHiddenRun(s, 0, 5);
    expect(s.progress).toBe(mid);
  });

  it("progress never decreases over random event sequences (including late checkpoint)", () => {
    for (let seed = 1; seed <= 50; seed++) {
      const rng = mulberry32(seed);
      let s: ProgressState = initialProgressState();
      let last = 0;
      for (let i = 0; i < 40; i++) {
        const r = rng();
        if (r < 0.15) s = openProblem(s);
        else if (r < 0.3) s = answerCheckpoint(s, rng() < 0.5);
        else if (r < 0.65) s = recordVisibleRun(s, Math.floor(rng() * 6), 5);
        else s = recordHiddenRun(s, Math.floor(rng() * 11), 10);
        expect(s.progress).toBeGreaterThanOrEqual(last);
        expect(s.progress).toBeLessThanOrEqual(1);
        last = s.progress;
      }
    }
  });

  it("computeProgress itself is monotonic in each input", () => {
    const base: ProgressState = { ...initialProgressState(), opened: true, visibleBest: 0.4, hiddenBest: 0.5 };
    const p0 = computeProgress(base);
    expect(computeProgress({ ...base, checkpoint: "wrong" })).toBeGreaterThan(p0);
    expect(computeProgress({ ...base, checkpoint: "correct" })).toBeGreaterThan(computeProgress({ ...base, checkpoint: "wrong" }));
    expect(computeProgress({ ...base, visibleBest: 0.9 })).toBeGreaterThan(p0);
    expect(computeProgress({ ...base, hiddenBest: 0.9 })).toBeGreaterThan(p0);
  });
});

describe("growth constants", () => {
  it("defaults match the spec", () => {
    expect(DEFAULT_GROWTH.opened).toBe(0.05);
    expect(DEFAULT_GROWTH.checkpointCorrect).toBe(0.15);
    expect(DEFAULT_GROWTH.checkpointWrong).toBe(0.08);
    expect(DEFAULT_GROWTH.visibleMax).toBe(0.35);
  });
  it("sanitize clamps, repairs NaN and keeps fixed sources under 95%", () => {
    const c = sanitizeGrowthConstants({ opened: 0.2, checkpointCorrect: 0.4, visibleMax: 0.6, checkpointWrong: 0.9, goldenMax: NaN });
    expect(c.opened + c.checkpointCorrect + c.visibleMax).toBeLessThanOrEqual(0.95 + 1e-9);
    expect(c.checkpointWrong).toBeLessThanOrEqual(c.checkpointCorrect);
    expect(c.goldenMax).toBe(DEFAULT_GROWTH.goldenMax);
  });
  it("custom constants change the math but a hidden pass still reaches 1.0", () => {
    const c = sanitizeGrowthConstants({ opened: 0.1, visibleMax: 0.5 });
    const s = recordHiddenRun(recordVisibleRun(openProblem(initialProgressState(), c), 1, 1, c), 1, 1, c);
    expect(s.progress).toBe(1);
  });
});

describe("accents", () => {
  const base = { firstTryFullPass: true, hintsUsed: 0, solveSeconds: 9999, medianSeconds: 600, difficulty: "easy" as const };
  it("golden leaves need a first-try full pass", () => {
    expect(computeAccents(base).golden).toBe(DEFAULT_GROWTH.goldenMax);
    expect(computeAccents({ ...base, firstTryFullPass: false }).golden).toBe(0);
  });
  it("hints reduce only the golden bonus, never growth", () => {
    const g = (h: number) => computeAccents({ ...base, hintsUsed: h }).golden;
    expect(g(1)).toBeLessThan(g(0));
    expect(g(2)).toBeLessThan(g(1));
    expect(g(4)).toBe(0);
    expect(g(50)).toBe(0);
    // growth state has no hint input at all:
    const s = recordHiddenRun(openProblem(initialProgressState()), 1, 1);
    expect(s.progress).toBe(1);
  });
  it("blossoms only when faster than the median; scales with speed", () => {
    expect(computeAccents({ ...base, solveSeconds: 700 }).blossom).toBe(0);
    const slightly = computeAccents({ ...base, solveSeconds: 500 }).blossom;
    const fast = computeAccents({ ...base, solveSeconds: 100 }).blossom;
    expect(slightly).toBeGreaterThan(0);
    expect(fast).toBeGreaterThan(slightly);
    expect(fast).toBeLessThanOrEqual(DEFAULT_GROWTH.blossomMax);
  });
  it("falls back to a default median when the user has too few solves", () => {
    expect(medianSolveSeconds([100, 200])).toBeUndefined();
    expect(medianSolveSeconds([100, 300, 200])).toBe(200);
    expect(medianSolveSeconds([100, 200, 300, 400])).toBe(250);
    expect(computeAccents({ ...base, medianSeconds: undefined, solveSeconds: 60 }).blossom).toBeGreaterThan(0);
  });
  it("applyAccents recolors leaves only: positions, order and count are untouched", () => {
    const tree = generateTree({ seed: 11, species: "oak", difficulty: "medium" });
    const out = applyAccents(tree, { golden: 0.2, blossom: 0.1 }, 11);
    expect(out).toHaveLength(tree.length);
    out.forEach((v, i) => {
      expect([v.x, v.y, v.z, v.growthIndex]).toEqual([tree[i]!.x, tree[i]!.y, tree[i]!.z, tree[i]!.growthIndex]);
      if (tree[i]!.type !== "leaf") expect(v.type).toBe(tree[i]!.type);
    });
    const leaves = tree.filter((v) => v.type === "leaf").length;
    expect(out.filter((v) => v.type === "golden").length).toBe(Math.round(0.2 * leaves));
    expect(applyAccents(tree, { golden: 0.2, blossom: 0.1 }, 11)).toEqual(out);
  });
});
