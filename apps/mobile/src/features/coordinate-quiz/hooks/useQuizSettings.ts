import { useCallback } from "react";
import { usePersistentSettings } from "../../../hooks/usePersistentSettings";
import type { QuizSettings } from "../lib/types";
import { DEFAULT_QUIZ_SETTINGS } from "../lib/types";

const STORAGE_KEY = "COORDINATE_QUIZ_SETTINGS";

export function useQuizSettings() {
  const { settings, isLoading, updateSettings, saveSettings, resetSettings } =
    usePersistentSettings<QuizSettings>(STORAGE_KEY, DEFAULT_QUIZ_SETTINGS);

  const updateSetting = useCallback(
    <K extends keyof QuizSettings>(key: K, value: QuizSettings[K]) =>
      updateSettings({ [key]: value } as Partial<QuizSettings>),
    [updateSettings],
  );

  return {
    settings,
    isLoading,
    updateSetting,
    saveSettings,
    resetSettings,
  };
}
