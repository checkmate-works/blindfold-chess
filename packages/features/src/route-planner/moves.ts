import type { Square } from "@blindfold-chess/types";

import { squareToCoords } from "./coords";
import { RouteStrategies } from "./_strategies";
import type { RoutePlannerPieceType } from "./types";

export function getPossibleMoves(
  piece: RoutePlannerPieceType,
  square: Square,
): Square[] {
  const [f, r] = squareToCoords(square);
  const strategy = RouteStrategies[piece];
  return strategy ? strategy.getMoves(f, r) : [];
}
