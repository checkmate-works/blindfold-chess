import { BishopRouteStrategy } from "./bishop";
import { KnightRouteStrategy } from "./knight";
import { QueenRouteStrategy } from "./queen";
import { RookRouteStrategy } from "./rook";
import type { RoutePlannerStrategy, RouteStrategyMap } from "./types";

export type { RoutePlannerStrategy, RouteStrategyMap };

export const RouteStrategies: RouteStrategyMap = {
  n: KnightRouteStrategy,
  b: BishopRouteStrategy,
  r: RookRouteStrategy,
  q: QueenRouteStrategy,
};
