import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { DiagonalQuizSettings } from "../lib/types";
import { DEFAULT_DIAGONAL_QUIZ_SETTINGS } from "../lib/types";

const STORAGE_KEY = "DIAGONAL_QUIZ_SETTINGS";

export function useDiagonalQuizSettings() {
  const [settings, setSettings] = useState<DiagonalQuizSettings>(
    DEFAULT_DIAGONAL_QUIZ_SETTINGS,
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as DiagonalQuizSettings;
          setSettings(parsed);
        }
      } catch (error) {
        console.error("Failed to load diagonal quiz settings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const saveSettings = useCallback(
    async (newSettings: DiagonalQuizSettings) => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
        setSettings(newSettings);
      } catch (error) {
        console.error("Failed to save diagonal quiz settings:", error);
      }
    },
    [],
  );

  const updateTimeLimit = useCallback(
    (timeLimit: number) => {
      const newSettings = { ...settings, timeLimit };
      saveSettings(newSettings);
    },
    [settings, saveSettings],
  );

  const resetSettings = useCallback(() => {
    saveSettings(DEFAULT_DIAGONAL_QUIZ_SETTINGS);
  }, [saveSettings]);

  return {
    settings,
    isLoading,
    updateTimeLimit,
    saveSettings,
    resetSettings,
  };
}
