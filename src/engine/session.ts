/**
 * Session domain logic: pure functions over the Session record.
 * (No DOM, no storage: the storage layer just persists whatever these return.)
 */
import { DEFAULT_GROWTH, type GrowthConstants } from "./constants";
import {
  answerCheckpoint as answerCheckpointProgress,
  computeAccents,
  initialProgressState,
  openProblem,
  recordHiddenRun,
  recordVisibleRun,
  type Accents,
  type CheckpointResult,
  type ProgressState,
} from "./progress";
import type { Difficulty, SpeciesId } from "./types";

export type SessionLanguage = "python" | "javascript" | "java" | "c" | "go";

export interface AttemptSummary {
  kind: "visible" | "hidden";
  passed: number;
  total: number;
  failedCategories: string[];
  allPassed: boolean;
  anyTimeout: boolean;
  anyError: boolean;
}

export interface Attempt {
  id: string;
  problemSlug: string;
  language: SessionLanguage;
  /** Snapshot of the code that was run. */
  code: string;
  summary: AttemptSummary;
  timestamp: number;
  runtimeMs: number;
}

export interface CheckpointAnswer {
  pattern: string;
  time: string;
  space: string;
  correct: boolean;
}

export interface Session {
  slug: string;
  difficulty: Difficulty;
  species: SpeciesId;
  seed: number;
  startedAt: number;
  activeSeconds: number;
  checkpoint: CheckpointResult;
  checkpointAnswer?: CheckpointAnswer;
  hintsUsed: number;
  attempts: Attempt[];
  solvedAt?: number;
  /** activeSeconds at the moment of the solve. */
  solveSeconds?: number;
  firstTryFullPass?: boolean;
  accents?: Accents;
  progress: ProgressState;
}

export const MAX_STORED_ATTEMPTS = 100;

export function createSession(
  params: { slug: string; difficulty: Difficulty; species: SpeciesId; seed: number; now: number },
  growth: GrowthConstants = DEFAULT_GROWTH,
): Session {
  return {
    slug: params.slug,
    difficulty: params.difficulty,
    species: params.species,
    seed: params.seed,
    startedAt: params.now,
    activeSeconds: 0,
    checkpoint: "none",
    hintsUsed: 0,
    attempts: [],
    progress: openProblem(initialProgressState(), growth),
  };
}

export const sessionProgress = (s: Session): number => s.progress.progress;
export const isSolved = (s: Session): boolean => s.solvedAt !== undefined;

export function addActiveSeconds(s: Session, seconds: number): Session {
  if (!(seconds > 0) || isSolved(s)) return s;
  return { ...s, activeSeconds: s.activeSeconds + seconds };
}

export function recordHint(s: Session, hintIndex: number): Session {
  return { ...s, hintsUsed: Math.max(s.hintsUsed, hintIndex + 1) };
}

/** The editorial unlocks after a solve or after every hint has been viewed. */
export function editorialUnlocked(s: Session, totalHints: number): boolean {
  return isSolved(s) || s.hintsUsed >= totalHints;
}

/** Only the first checkpoint answer counts: it cannot be retried for more growth. */
export function recordCheckpoint(s: Session, answer: CheckpointAnswer, growth: GrowthConstants = DEFAULT_GROWTH): Session {
  if (s.checkpoint !== "none") return s;
  return {
    ...s,
    checkpoint: answer.correct ? "correct" : "wrong",
    checkpointAnswer: answer,
    progress: answerCheckpointProgress(s.progress, answer.correct, growth),
  };
}

/**
 * Applies a finished run. Visible runs move the visible bar; hidden runs
 * (submissions) move the hidden bar and can complete the tree. Failures never
 * shrink anything because every source ratchets.
 */
export function recordAttempt(
  s: Session,
  attempt: Attempt,
  opts: { growth?: GrowthConstants; medianSeconds?: number } = {},
): Session {
  const growth = opts.growth ?? DEFAULT_GROWTH;
  const attempts = [...s.attempts, attempt].slice(-MAX_STORED_ATTEMPTS);
  const { kind, passed, total, allPassed } = attempt.summary;
  const progress =
    kind === "visible" ? recordVisibleRun(s.progress, passed, total, growth) : recordHiddenRun(s.progress, passed, total, growth);
  let next: Session = { ...s, attempts, progress };

  if (kind === "hidden" && allPassed && !isSolved(s)) {
    const priorSubmits = s.attempts.filter((a) => a.summary.kind === "hidden").length;
    const firstTry = priorSubmits === 0;
    next = {
      ...next,
      progress: { ...progress, progress: 1, hiddenBest: 1 },
      solvedAt: attempt.timestamp,
      solveSeconds: s.activeSeconds,
      firstTryFullPass: firstTry,
      accents: computeAccents(
        {
          firstTryFullPass: firstTry,
          hintsUsed: s.hintsUsed,
          solveSeconds: s.activeSeconds,
          medianSeconds: opts.medianSeconds,
          difficulty: s.difficulty,
        },
        growth,
      ),
    };
  }
  return next;
}

export function submitCount(s: Session): number {
  return s.attempts.filter((a) => a.summary.kind === "hidden").length;
}
