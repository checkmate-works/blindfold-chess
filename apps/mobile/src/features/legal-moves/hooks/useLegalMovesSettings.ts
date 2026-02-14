import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { PieceType, LegalMovesSettings } from "../lib/types";
import { DEFAULT_LEGAL_MOVES_SETTINGS } from "../lib/types";

const STORAGE_KEY = "LEGAL_MOVES_SETTINGS";

export function useLegalMovesSettings() {
  const [settings, setSettings] = useState<LegalMovesSettings>(
    DEFAULT_LEGAL_MOVES_SETTINGS,
  );
  const [isLoading, setIsLoading] = useState(true);

  // Load settings from storage on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored) {
          const parsed = JSON.parse(stored) as LegalMovesSettings;
          setSettings(parsed);
        }
      } catch (error) {
        console.error("Failed to load legal moves settings:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  // Save settings to storage
  const saveSettings = useCallback(async (newSettings: LegalMovesSettings) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error("Failed to save legal moves settings:", error);
    }
  }, []);

  // Update duration
  const updateDuration = useCallback(
    (duration: number) => {
      const newSettings = { ...settings, duration };
      saveSettings(newSettings);
    },
    [settings, saveSettings],
  );

  // Toggle a piece on/off
  const togglePiece = useCallback(
    (piece: PieceType) => {
      const isSelected = settings.selectedPieces.includes(piece);
      let newPieces: PieceType[];

      if (isSelected) {
        // Don't allow deselecting the last piece
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

  // Reset to defaults
  const resetSettings = useCallback(() => {
    saveSettings(DEFAULT_LEGAL_MOVES_SETTINGS);
  }, [saveSettings]);

  return {
    settings,
    isLoading,
    updateDuration,
    togglePiece,
    saveSettings,
    resetSettings,
  };
}
