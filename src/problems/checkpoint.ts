import type { Problem } from "./schema";

export interface CheckpointGuess {
  pattern: string;
  time: string;
  space: string;
}

export interface CheckpointVerdict {
  correct: boolean;
  patternOk: boolean;
  timeOk: boolean;
  spaceOk: boolean;
}

/** Correct only if the pattern AND both complexities are right. */
export function evaluateCheckpoint(problem: Pick<Problem, "approachCheckpoint">, guess: CheckpointGuess): CheckpointVerdict {
  const cp = problem.approachCheckpoint;
  const patternOk = guess.pattern === cp.correctPattern;
  const timeOk = guess.time === cp.complexity.correctTime;
  const spaceOk = guess.space === cp.complexity.correctSpace;
  return { correct: patternOk && timeOk && spaceOk, patternOk, timeOk, spaceOk };
}
