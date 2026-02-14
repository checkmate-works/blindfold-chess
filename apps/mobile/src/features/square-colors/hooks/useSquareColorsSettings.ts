import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { SquareColorsSettings } from "../lib/types";
import { DEFAULT_SQUARE_COLORS_SETTINGS } from "../lib/types";

const STORAGE_KEY = "SQUARE_COLORS_SETTINGS";

export function useSquareColorsSettings() {
  const [settings, setSettings] = useState<SquareColorsSettings>(
    DEFAULT_SQUARE_COLORS_SETTINGS,
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as SquareColorsSettings;
          setSettings(parsed);
        }
      } catch (error) {
        console.error("Failed to load square colors settings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const saveSettings = useCallback(
    async (newSettings: SquareColorsSettings) => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
        setSettings(newSettings);
      } catch (error) {
        console.error("Failed to save square colors settings:", error);
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
    saveSettings(DEFAULT_SQUARE_COLORS_SETTINGS);
  }, [saveSettings]);

  return {
    settings,
    isLoading,
    updateTimeLimit,
    saveSettings,
    resetSettings,
  };
}
