import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { RoutePlannerPieceType, RoutePlannerSettings } from "../lib/types";
import { DEFAULT_ROUTE_PLANNER_SETTINGS } from "../lib/types";

const STORAGE_KEY = "ROUTE_PLANNER_SETTINGS";

export function useRoutePlannerSettings() {
  const [settings, setSettings] = useState<RoutePlannerSettings>(
    DEFAULT_ROUTE_PLANNER_SETTINGS,
  );
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as RoutePlannerSettings;
          setSettings(parsed);
        }
      } catch (error) {
        console.error("Failed to load route planner settings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const saveSettings = useCallback(
    async (newSettings: RoutePlannerSettings) => {
      try {
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
        setSettings(newSettings);
      } catch (error) {
        console.error("Failed to save route planner settings:", error);
      }
    },
    [],
  );

  const updateProblemCount = useCallback(
    (problemCount: number) => {
      const newSettings = { ...settings, problemCount };
      saveSettings(newSettings);
    },
    [settings, saveSettings],
  );

  const togglePiece = useCallback(
    (piece: RoutePlannerPieceType) => {
      const isSelected = settings.selectedPieces.includes(piece);
      let newPieces: RoutePlannerPieceType[];

      if (isSelected) {
        if (settings.selectedPieces.length <= 1) return;
        newPieces = settings.selectedPieces.filter((p) => p !== piece);
      } else {
        newPieces = [...settings.selectedPieces, piece];
      }

      const newSettings = { ...settings, selectedPieces: newPieces };
      saveSettings(newSettings);
    },
    [settings, saveSettings],
  );

  const resetSettings = useCallback(() => {
    saveSettings(DEFAULT_ROUTE_PLANNER_SETTINGS);
  }, [saveSettings]);

  return {
    settings,
    isLoading,
    updateProblemCount,
    togglePiece,
    saveSettings,
    resetSettings,
  };
}
