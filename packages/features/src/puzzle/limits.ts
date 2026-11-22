/**
 * Upper bound on the number of moves in one puzzle's solution line.
 *
 * The puzzle-authoring UI enforces it, so no published puzzle is longer.
 * Recording a solved puzzle reuses it as the ceiling on the player's move
 * count: the count is reported by the client, and no honest run of a puzzle
 * can contain more player moves than the longest solution allowed.
 */
export const MAX_SOLUTION_MOVES = 20;
