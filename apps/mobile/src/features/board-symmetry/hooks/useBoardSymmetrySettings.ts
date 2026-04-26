import { useCallback } from "react";
import { useAsyncStorageSettings } from "../../../lib/persistent-settings/useAsyncStorageSettings";
import type { BoardSymmetrySettings } from "../lib/types";
import { DEFAULT_BOARD_SYMMETRY_SETTINGS } from "../lib/types";

const STORAGE_KEY = "BOARD_SYMMETRY_SETTINGS";

export function useBoardSymmetrySettings() {
  const { settings, isLoaded, updateSettings, resetSettings } =
    useAsyncStorageSettings<BoardSymmetrySettings>(
      STORAGE_KEY,
      DEFAULT_BOARD_SYMMETRY_SETTINGS,
    );

  const updateTimeLimit = useCallback(
    (timeLimit: number) => updateSettings({ timeLimit }),
    [updateSettings],
  );

  return {
    settings,
    isLoading: !isLoaded,
    updateTimeLimit,
    resetSettings,
  };
}
