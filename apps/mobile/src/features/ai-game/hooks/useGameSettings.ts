import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Side } from "@blindfold-chess/types";

import type { SkillLevel, AiGameSettings } from "../lib/types";
import { DEFAULT_AI_GAME_SETTINGS } from "../lib/types";

const STORAGE_KEY = "ai-game-settings";

export function useGameSettings() {
  const [settings, setSettings] = useState<AiGameSettings>(
    DEFAULT_AI_GAME_SETTINGS,
  );
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored) {
          const parsed = JSON.parse(stored) as AiGameSettings;
          setSettings(parsed);
        }
      })
      .catch(() => {
        // Use defaults on error
      })
      .finally(() => {
        setIsLoaded(true);
      });
  }, []);

  const updatePlayerColor = useCallback((playerColor: Side) => {
    setSettings((prev) => {
      const updated = { ...prev, playerColor };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(
        () => {},
      );
      return updated;
    });
  }, []);

  const updateSkillLevel = useCallback((skillLevel: SkillLevel) => {
    setSettings((prev) => {
      const updated = { ...prev, skillLevel };
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(
        () => {},
      );
      return updated;
    });
  }, []);

  return {
    settings,
    isLoaded,
    updatePlayerColor,
    updateSkillLevel,
  };
}
