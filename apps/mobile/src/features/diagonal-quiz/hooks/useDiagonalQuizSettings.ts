import { useCallback } from "react";
import { usePersistentSettings } from "../../../hooks/usePersistentSettings";
import type { DiagonalQuizSettings } from "../lib/types";
import { DEFAULT_DIAGONAL_QUIZ_SETTINGS } from "../lib/types";

const STORAGE_KEY = "DIAGONAL_QUIZ_SETTINGS";

export function useDiagonalQuizSettings() {
  const { settings, isLoading, updateSettings, saveSettings, resetSettings } =
    usePersistentSettings<DiagonalQuizSettings>(
      STORAGE_KEY,
      DEFAULT_DIAGONAL_QUIZ_SETTINGS,
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
