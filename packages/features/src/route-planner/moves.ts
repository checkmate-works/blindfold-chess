import { squareToCoords } from "./coords";
import { RouteStrategies } from "./_strategies";
import type { RoutePlannerPieceType } from "./types";

export function getPossibleMoves(
  piece: RoutePlannerPieceType,
  square: string,
): string[] {
  const [f, r] = squareToCoords(square);
  const strategy = RouteStrategies[piece];
  return strategy ? strategy.getMoves(f, r) : [];
}
