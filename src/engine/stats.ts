/** Pure statistics over sessions: streaks, heatmap, tallies. */
import type { Session } from "./session";
import type { Difficulty, SpeciesId } from "./types";

/** Local calendar day as "YYYY-MM-DD". */
export function dayKey(timestamp: number): string {
  const d = new Date(timestamp);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

function shiftDay(key: string, delta: number): string {
  const [y, m, d] = key.split("-").map(Number) as [number, number, number];
  // Noon avoids DST edge cases when stepping by whole days.
  return dayKey(new Date(y, m - 1, d + delta, 12).getTime());
}

export function solveDays(sessions: readonly Session[]): Set<string> {
  const days = new Set<string>();
  for (const s of sessions) if (s.solvedAt !== undefined) days.add(dayKey(s.solvedAt));
  return days;
}

/**
 * Current streak: consecutive days with at least one solve, ending today, or
 * yesterday (so the streak is still "alive" until the day is over).
 * A broken streak is simply 0: the tree returns to green, nothing dies.
 */
export function currentStreak(sessions: readonly Session[], now: number): number {
  const days = solveDays(sessions);
  let cursor = dayKey(now);
  if (!days.has(cursor)) cursor = shiftDay(cursor, -1);
  let streak = 0;
  while (days.has(cursor)) {
    streak++;
    cursor = shiftDay(cursor, -1);
  }
  return streak;
}

export function longestStreak(sessions: readonly Session[]): number {
  const sorted = [...solveDays(sessions)].sort();
  let best = 0;
  let run = 0;
  let prev: string | null = null;
  for (const day of sorted) {
    run = prev !== null && shiftDay(prev, 1) === day ? run + 1 : 1;
    best = Math.max(best, run);
    prev = day;
  }
  return best;
}

/** Number of solves per local day. */
export function heatmap(sessions: readonly Session[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const s of sessions) {
    if (s.solvedAt === undefined) continue;
    const k = dayKey(s.solvedAt);
    out[k] = (out[k] ?? 0) + 1;
  }
  return out;
}

export interface ForestStats {
  solved: number;
  inProgress: number;
  bySpecies: Partial<Record<SpeciesId, number>>;
  byDifficulty: Record<Difficulty, number>;
  totalActiveSeconds: number;
  currentStreak: number;
  longestStreak: number;
}

export function forestStats(sessions: readonly Session[], now: number): ForestStats {
  const bySpecies: Partial<Record<SpeciesId, number>> = {};
  const byDifficulty: Record<Difficulty, number> = { easy: 0, medium: 0, hard: 0 };
  let solved = 0;
  let totalActiveSeconds = 0;
  for (const s of sessions) {
    totalActiveSeconds += s.activeSeconds;
    if (s.solvedAt === undefined) continue;
    solved++;
    bySpecies[s.species] = (bySpecies[s.species] ?? 0) + 1;
    byDifficulty[s.difficulty]++;
  }
  return {
    solved,
    inProgress: sessions.length - solved,
    bySpecies,
    byDifficulty,
    totalActiveSeconds,
    currentStreak: currentStreak(sessions, now),
    longestStreak: longestStreak(sessions),
  };
}

/** Solve times (active seconds) of past solves at one difficulty, for the personal median. */
export function solveSecondsFor(sessions: readonly Session[], difficulty: Difficulty, excludeSlug?: string): number[] {
  return sessions
    .filter((s) => s.solvedAt !== undefined && s.difficulty === difficulty && s.slug !== excludeSlug && s.solveSeconds !== undefined)
    .map((s) => s.solveSeconds as number);
}
