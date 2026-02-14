import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { BoardSymmetrySettings } from "../lib/types";
import { DEFAULT_BOARD_SYMMETRY_SETTINGS } from "../lib/types";

const STORAGE_KEY = "BOARD_SYMMETRY_SETTINGS";

export function useBoardSymmetrySettings() {
  const [settings, setSettings] = useState<BoardSymmetrySettings>(
    DEFAULT_BOARD_SYMMETRY_SETTINGS,
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as BoardSymmetrySettings;
          setSettings(parsed);
        }
      } catch (error) {
        console.error("Failed to load board symmetry settings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const saveSettings = useCallback(
    async (newSettings: BoardSymmetrySettings) => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
        setSettings(newSettings);
      } catch (error) {
        console.error("Failed to save board symmetry settings:", error);
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
    saveSettings(DEFAULT_BOARD_SYMMETRY_SETTINGS);
  }, [saveSettings]);

  return {
    settings,
    isLoading,
    updateTimeLimit,
    saveSettings,
    resetSettings,
  };
}
