import { useAsyncStorageSettings } from "../../../lib/persistent-settings/useAsyncStorageSettings";
import type { AiGameSettings } from "../lib/types";
import { DEFAULT_AI_GAME_SETTINGS } from "../lib/types";

const STORAGE_KEY = "ai-game-settings";

export const useGameSettings = () =>
  useAsyncStorageSettings<AiGameSettings>(
    STORAGE_KEY,
    DEFAULT_AI_GAME_SETTINGS,
  );
