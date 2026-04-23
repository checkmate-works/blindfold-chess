import { useCallback } from "react";
import { useAsyncStorageSettings } from "../../../lib/persistent-settings/useAsyncStorageSettings";
import type { DiagonalQuizSettings } from "../lib/types";
import { DEFAULT_DIAGONAL_QUIZ_SETTINGS } from "../lib/types";

const STORAGE_KEY = "DIAGONAL_QUIZ_SETTINGS";

export function useDiagonalQuizSettings() {
  const { settings, isLoaded, updateSettings, resetSettings } =
    useAsyncStorageSettings<DiagonalQuizSettings>(
      STORAGE_KEY,
      DEFAULT_DIAGONAL_QUIZ_SETTINGS,
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
