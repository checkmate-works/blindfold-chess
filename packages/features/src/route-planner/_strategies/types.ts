import type { RoutePlannerPieceType } from "../types";

/**
 * Strategy interface for piece-specific move generation and difficulty constraints.
 *
 * Each piece type has a `meetsConstraint` predicate that rejects trivially simple
 * problems (e.g., 1-move direct routes). The `pathLength` parameter includes the
 * start square, so `pathLength === 3` means 2 moves (start -> intermediate -> end).
 */
export interface RoutePlannerStrategy {
  getMoves(file: number, rank: number): string[];
  meetsConstraint(pathLength: number): boolean;
}

export type RouteStrategyMap = Record<
  RoutePlannerPieceType,
  RoutePlannerStrategy
>;
