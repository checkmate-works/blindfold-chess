import { useCallback } from "react";
import { usePersistentSettings } from "../../../hooks/usePersistentSettings";
import type { SquareColorsSettings } from "../lib/types";
import { DEFAULT_SQUARE_COLORS_SETTINGS } from "../lib/types";

const STORAGE_KEY = "SQUARE_COLORS_SETTINGS";

export function useSquareColorsSettings() {
  const { settings, isLoading, updateSettings, saveSettings, resetSettings } =
    usePersistentSettings<SquareColorsSettings>(
      STORAGE_KEY,
      DEFAULT_SQUARE_COLORS_SETTINGS,
    );

  const updateTimeLimit = useCallback(
    (timeLimit: number) => updateSettings({ timeLimit }),
    [updateSettings],
  );

  return {
    settings,
    isLoading,
    updateTimeLimit,
    saveSettings,
    resetSettings,
  };
}
