import type { RoutePlannerChallengePiece } from "@blindfold-chess/features/route-planner";

import { useAsyncStorageSettings } from "../../../lib/persistent-settings/useAsyncStorageSettings";

/**
 * The route-planner setup: the piece the challenge and training use —
 * knight or bishop, the web's challenge pieces and leaderboard keys. Stored
 * under a new key: the former problem count and multi-piece selection have
 * no counterpart in the 60-second challenge.
 */
export type RoutePlannerSetup = { selectedPiece: RoutePlannerChallengePiece };

const DEFAULTS: RoutePlannerSetup = { selectedPiece: "knight" };

export function useRoutePlannerSettings() {
  return useAsyncStorageSettings<RoutePlannerSetup>(
    "ROUTE_PLANNER_CHALLENGE_SETTINGS",
    DEFAULTS,
  );
}
