import { describe, expect, it } from "vitest";
import {
  addActiveSeconds,
  createSession,
  editorialUnlocked,
  recordAttempt,
  recordCheckpoint,
  recordHint,
  sessionProgress,
  submitCount,
  MAX_STORED_ATTEMPTS,
  type Attempt,
  type Session,
} from "./session";

const base = () => createSession({ slug: "s", difficulty: "easy", species: "bamboo", seed: 1, now: 1000 });

const attempt = (kind: "visible" | "hidden", passed: number, total: number, ts = 2000): Attempt => ({
  id: `${kind}-${ts}-${passed}`,
  problemSlug: "s",
  language: "javascript",
  code: "x",
  timestamp: ts,
  runtimeMs: 3,
  summary: { kind, passed, total, failedCategories: passed === total ? [] : ["edge"], allPassed: passed === total, anyTimeout: false, anyError: false },
});

describe("session lifecycle", () => {
  it("starting a problem plants a seed worth +0.05", () => {
    const s = base();
    expect(sessionProgress(s)).toBeCloseTo(0.05);
    expect(s.attempts).toEqual([]);
  });

  it("visible runs grow the tree but never solve it", () => {
    const s = recordAttempt(base(), attempt("visible", 3, 3));
    expect(sessionProgress(s)).toBeCloseTo(0.05 + 0.35);
    expect(s.solvedAt).toBeUndefined();
  });

  it("a failing submit never shrinks the tree and does not punish", () => {
    let s = recordAttempt(base(), attempt("visible", 3, 3));
    const before = sessionProgress(s);
    s = recordAttempt(s, attempt("hidden", 0, 10));
    expect(sessionProgress(s)).toBeGreaterThanOrEqual(before);
    s = recordAttempt(s, attempt("hidden", 4, 10));
    const mid = sessionProgress(s);
    s = recordAttempt(s, attempt("hidden", 1, 10));
    expect(sessionProgress(s)).toBe(mid);
  });

  it("an all-pass submit completes the tree and records the solve", () => {
    const s = recordAttempt(base(), attempt("hidden", 10, 10, 5000));
    expect(sessionProgress(s)).toBe(1);
    expect(s.solvedAt).toBe(5000);
    expect(s.firstTryFullPass).toBe(true);
    expect(s.accents?.golden).toBeGreaterThan(0);
  });

  it("first-try golden bonus is lost (growth is not) after an earlier failed submit", () => {
    let s = recordAttempt(base(), attempt("hidden", 3, 10, 2000));
    s = recordAttempt(s, attempt("hidden", 10, 10, 3000));
    expect(sessionProgress(s)).toBe(1);
    expect(s.firstTryFullPass).toBe(false);
    expect(s.accents?.golden).toBe(0);
    expect(submitCount(s)).toBe(2);
  });

  it("hints reduce only the golden bonus, never growth", () => {
    const clean = recordAttempt(base(), attempt("hidden", 10, 10));
    const hinted = recordAttempt(recordHint(recordHint(base(), 0), 1), attempt("hidden", 10, 10));
    expect(sessionProgress(hinted)).toBe(sessionProgress(clean));
    expect(hinted.accents!.golden).toBeLessThan(clean.accents!.golden);
  });

  it("solving faster than the median earns blossoms", () => {
    const s = recordAttempt(addActiveSeconds(base(), 60), attempt("hidden", 5, 5), { medianSeconds: 600 });
    expect(s.accents!.blossom).toBeGreaterThan(0);
    const slow = recordAttempt(addActiveSeconds(base(), 900), attempt("hidden", 5, 5), { medianSeconds: 600 });
    expect(slow.accents!.blossom).toBe(0);
  });

  it("only the first checkpoint answer counts", () => {
    const wrong = { pattern: "dp", time: "O(n)", space: "O(1)", correct: false };
    let s = recordCheckpoint(base(), wrong);
    expect(s.checkpoint).toBe("wrong");
    expect(sessionProgress(s)).toBeCloseTo(0.05 + 0.08);
    const again = recordCheckpoint(s, { ...wrong, correct: true });
    expect(again).toBe(s);
    s = recordCheckpoint(base(), { ...wrong, correct: true });
    expect(sessionProgress(s)).toBeCloseTo(0.2);
  });

  it("active time stops counting once solved", () => {
    let s = addActiveSeconds(base(), 30);
    expect(s.activeSeconds).toBe(30);
    s = recordAttempt(s, attempt("hidden", 1, 1));
    expect(addActiveSeconds(s, 100).activeSeconds).toBe(30);
    expect(addActiveSeconds(base(), -5).activeSeconds).toBe(0);
  });

  it("the editorial unlocks after a solve or after all hints", () => {
    const s: Session = base();
    expect(editorialUnlocked(s, 3)).toBe(false);
    expect(editorialUnlocked(recordHint(recordHint(recordHint(s, 0), 1), 2), 3)).toBe(true);
    expect(editorialUnlocked(recordAttempt(s, attempt("hidden", 1, 1)), 3)).toBe(true);
  });

  it("keeps only the most recent attempts", () => {
    let s = base();
    for (let i = 0; i < MAX_STORED_ATTEMPTS + 10; i++) s = recordAttempt(s, attempt("visible", 0, 3, i));
    expect(s.attempts).toHaveLength(MAX_STORED_ATTEMPTS);
    expect(s.attempts.at(-1)!.timestamp).toBe(MAX_STORED_ATTEMPTS + 9);
  });
});
