import { useCallback } from "react";
import { toggleSelection } from "@blindfold-chess/features/common";
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
      const newPieces = toggleSelection(settings.selectedPieces, piece);
      if (newPieces === settings.selectedPieces) return;
      updateSettings({ selectedPieces: newPieces });
    },
    [settings.selectedPieces, updateSettings],
  );

  return { ...persisted, togglePiece };
}
