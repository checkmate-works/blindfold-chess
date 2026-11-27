export type { PuzzleSolutionMove } from "./types";
export type {
  Attempt,
  MoveSquares,
  ParsedSolution,
  PuzzleSubmitOutcome,
  SessionState,
  SolveContext,
} from "./puzzle-match";
export { evaluatePuzzleSubmit, parseSolutionLines } from "./puzzle-match";
export type {
  AttemptCell,
  AttemptRow,
  AttemptStatus,
  PlayerStep,
} from "./attempt-history";
export {
  buildCells,
  buildRows,
  computeAttemptStatus,
  groupAttemptsByPlayerStep,
} from "./attempt-history";
export type { SolutionPair } from "./solution-pairs";
export { buildSolutionPairs } from "./solution-pairs";
export { MAX_SOLUTION_MOVES } from "./limits";
