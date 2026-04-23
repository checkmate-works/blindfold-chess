import { useCallback } from "react";
import type { Side } from "@blindfold-chess/types";
import { useAsyncStorageSettings } from "../../../lib/persistent-settings/useAsyncStorageSettings";
import type { SkillLevel, AiGameSettings } from "../lib/types";
import { DEFAULT_AI_GAME_SETTINGS } from "../lib/types";

const STORAGE_KEY = "ai-game-settings";

export function useGameSettings() {
  const { settings, isLoaded, updateSettings } =
    useAsyncStorageSettings<AiGameSettings>(
      STORAGE_KEY,
      DEFAULT_AI_GAME_SETTINGS,
    );

  const updatePlayerColor = useCallback(
    (playerColor: Side) => updateSettings({ playerColor }),
    [updateSettings],
  );

  const updateSkillLevel = useCallback(
    (skillLevel: SkillLevel) => updateSettings({ skillLevel }),
    [updateSettings],
  );

  return {
    settings,
    isLoaded,
    updatePlayerColor,
    updateSkillLevel,
  };
}
