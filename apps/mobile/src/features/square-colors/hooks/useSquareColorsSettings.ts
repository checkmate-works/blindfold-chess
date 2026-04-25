import { useCallback } from "react";
import { useAsyncStorageSettings } from "../../../lib/persistent-settings/useAsyncStorageSettings";
import type { SquareColorsSettings } from "../lib/types";
import { DEFAULT_SQUARE_COLORS_SETTINGS } from "../lib/types";

const STORAGE_KEY = "SQUARE_COLORS_SETTINGS";

export function useSquareColorsSettings() {
  const { settings, isLoaded, updateSettings, resetSettings } =
    useAsyncStorageSettings<SquareColorsSettings>(
      STORAGE_KEY,
      DEFAULT_SQUARE_COLORS_SETTINGS,
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
