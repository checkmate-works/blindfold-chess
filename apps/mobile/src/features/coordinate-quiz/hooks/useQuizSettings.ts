import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { QuizSettings } from "../lib/types";
import { DEFAULT_QUIZ_SETTINGS } from "../lib/types";

const STORAGE_KEY = "COORDINATE_QUIZ_SETTINGS";

export function useQuizSettings() {
  const [settings, setSettings] = useState<QuizSettings>(DEFAULT_QUIZ_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings from storage on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as QuizSettings;
          setSettings(parsed);
        }
      } catch (error) {
        console.error("Failed to load quiz settings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Save settings to storage
  const saveSettings = useCallback(async (newSettings: QuizSettings) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error("Failed to save quiz settings:", error);
    }
  }, []);

  // Update a single setting
  const updateSetting = useCallback(
    <K extends keyof QuizSettings>(key: K, value: QuizSettings[K]) => {
      const newSettings = { ...settings, [key]: value };
      saveSettings(newSettings);
    },
    [settings, saveSettings],
  );

  // Reset to defaults
  const resetSettings = useCallback(() => {
    saveSettings(DEFAULT_QUIZ_SETTINGS);
  }, [saveSettings]);

  return {
    settings,
    isLoading,
    updateSetting,
    saveSettings,
    resetSettings,
  };
}
