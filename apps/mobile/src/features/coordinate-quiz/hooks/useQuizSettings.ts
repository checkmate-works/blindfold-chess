import { useCallback } from "react";
import { useAsyncStorageSettings } from "../../../lib/persistent-settings/useAsyncStorageSettings";
import type { QuizSettings } from "../lib/types";
import { DEFAULT_QUIZ_SETTINGS } from "../lib/types";

const STORAGE_KEY = "COORDINATE_QUIZ_SETTINGS";

export function useQuizSettings() {
  const { settings, isLoaded, updateSettings, resetSettings } =
    useAsyncStorageSettings<QuizSettings>(STORAGE_KEY, DEFAULT_QUIZ_SETTINGS);

  const updateSetting = useCallback(
    <K extends keyof QuizSettings>(key: K, value: QuizSettings[K]) =>
      updateSettings({ [key]: value } as Partial<QuizSettings>),
    [updateSettings],
  );

  return {
    settings,
    isLoading: !isLoaded,
    updateSetting,
    resetSettings,
  };
}
