/**
 * One move of a puzzle's solution line: the SAN and the author's optional
 * note on it. The web stores lines as `PuzzleSolutionMove[]` in the
 * `puzzle_solutions.solution_moves` JSONB column; the mobile app receives
 * the same shape from the mobile API.
 */
export type PuzzleSolutionMove = {
  san: string;
  note: string | null;
};
