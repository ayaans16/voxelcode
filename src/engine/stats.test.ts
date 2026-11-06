import { describe, expect, it } from "vitest";
import { currentStreak, dayKey, forestStats, heatmap, longestStreak, solveSecondsFor } from "./stats";
import { createSession, type Session } from "./session";

const at = (y: number, m: number, d: number, h = 12) => new Date(y, m - 1, d, h).getTime();
const solved = (slug: string, when: number, extra: Partial<Session> = {}): Session => ({
  ...createSession({ slug, difficulty: "easy", species: "oak", seed: 1, now: when }),
  solvedAt: when,
  solveSeconds: 100,
  ...extra,
});

describe("streaks", () => {
  const sessions = [solved("a", at(2026, 3, 1)), solved("b", at(2026, 3, 2)), solved("c", at(2026, 3, 3))];
  it("counts consecutive days ending today", () => {
    expect(currentStreak(sessions, at(2026, 3, 3, 20))).toBe(3);
  });
  it("stays alive until the end of the next day, then resets to 0 (no punishment)", () => {
    expect(currentStreak(sessions, at(2026, 3, 4, 9))).toBe(3);
    expect(currentStreak(sessions, at(2026, 3, 5, 9))).toBe(0);
  });
  it("multiple solves on one day count once", () => {
    expect(currentStreak([...sessions, solved("d", at(2026, 3, 3, 18))], at(2026, 3, 3))).toBe(3);
  });
  it("handles month boundaries", () => {
    const s = [solved("a", at(2026, 2, 28)), solved("b", at(2026, 3, 1))];
    expect(currentStreak(s, at(2026, 3, 1))).toBe(2);
  });
  it("longest streak scans history", () => {
    const s = [...sessions, solved("x", at(2026, 3, 10)), solved("y", at(2026, 3, 11))];
    expect(longestStreak(s)).toBe(3);
    expect(longestStreak([])).toBe(0);
  });
});

describe("tallies", () => {
  it("builds the heatmap and forest stats", () => {
    const s = [
      solved("a", at(2026, 3, 1), { species: "bamboo", difficulty: "easy", activeSeconds: 60 }),
      solved("b", at(2026, 3, 1, 15), { species: "bamboo", difficulty: "hard", activeSeconds: 120 }),
      createSession({ slug: "c", difficulty: "medium", species: "oak", seed: 1, now: at(2026, 3, 2) }),
    ];
    expect(heatmap(s)).toEqual({ [dayKey(at(2026, 3, 1))]: 2 });
    const f = forestStats(s, at(2026, 3, 1));
    expect(f.solved).toBe(2);
    expect(f.inProgress).toBe(1);
    expect(f.bySpecies).toEqual({ bamboo: 2 });
    expect(f.byDifficulty).toEqual({ easy: 1, medium: 0, hard: 1 });
    expect(f.totalActiveSeconds).toBe(180);
  });
  it("collects solve times per difficulty, excluding a slug", () => {
    const s = [solved("a", 1, { solveSeconds: 10 }), solved("b", 2, { solveSeconds: 20 }), solved("c", 3, { difficulty: "hard", solveSeconds: 99 })];
    expect(solveSecondsFor(s, "easy").sort()).toEqual([10, 20]);
    expect(solveSecondsFor(s, "easy", "a")).toEqual([20]);
  });
});
