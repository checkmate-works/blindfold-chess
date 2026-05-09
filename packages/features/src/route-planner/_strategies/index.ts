import { BishopRouteStrategy } from "./bishop";
import { KnightRouteStrategy } from "./knight";
import { QueenRouteStrategy } from "./queen";
import { RookRouteStrategy } from "./rook";
import type { RouteStrategyMap } from "./types";

export const RouteStrategies: RouteStrategyMap = {
  n: KnightRouteStrategy,
  b: BishopRouteStrategy,
  r: RookRouteStrategy,
  q: QueenRouteStrategy,
};
