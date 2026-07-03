import { useCallback } from "react";
import { useAsyncStorageSettings } from "../../../lib/persistent-settings/useAsyncStorageSettings";
import type { RoutePlannerPieceType, RoutePlannerSettings } from "../lib/types";
import { DEFAULT_ROUTE_PLANNER_SETTINGS } from "../lib/types";

const STORAGE_KEY = "ROUTE_PLANNER_SETTINGS";

export function useRoutePlannerSettings() {
  const persisted = useAsyncStorageSettings<RoutePlannerSettings>(
    STORAGE_KEY,
    DEFAULT_ROUTE_PLANNER_SETTINGS,
  );
  const { settings, updateSettings } = persisted;

  const togglePiece = useCallback(
    (piece: RoutePlannerPieceType) => {
      const isSelected = settings.selectedPieces.includes(piece);
      let newPieces: RoutePlannerPieceType[];

      if (isSelected) {
        if (settings.selectedPieces.length <= 1) return;
        newPieces = settings.selectedPieces.filter((p) => p !== piece);
      } else {
        newPieces = [...settings.selectedPieces, piece];
      }

      updateSettings({ selectedPieces: newPieces });
    },
    [settings.selectedPieces, updateSettings],
  );

  return { ...persisted, togglePiece };
}
