/**
 * Public API barrel for the route-planner module.
 *
 * The implementation is split across focused files:
 * - `_strategies/*`  — per-piece move-generation and difficulty strategies
 * - `coords.ts`      — square <-> coordinate helpers, color predicate
 * - `moves.ts`       — `getPossibleMoves` (piece dispatch)
 * - `bfs.ts`         — `findShortestPath` (BFS)
 * - `validate.ts`    — `validateUserPath`
 * - `generate.ts`    — `generateProblem`
 *
 * This file is kept as a barrel to preserve the existing import surface
 * used by `route-planner/index.ts` and the co-located `logic.test.ts`.
 */
export {
  coordsToSquare,
  isSameColor,
  isValidRoutePlannerSquare,
  squareToCoords,
} from "./coords";
export { getPossibleMoves } from "./moves";
export { findShortestPath } from "./bfs";
export { validateUserPath } from "./validate";
export { generateProblem } from "./generate";
