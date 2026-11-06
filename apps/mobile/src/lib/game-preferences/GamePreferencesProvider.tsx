import { createContext, useContext, useMemo, type ReactNode } from "react";
import { usePersistentSettings } from "@blindfold-chess/features/common/client";
import {
  DEFAULT_GAME_PREFERENCES,
  type GamePreferences,
} from "@blindfold-chess/features/game-preferences";

import { asyncStorageAdapter } from "../persistent-settings/async-storage-adapter";
import { createSanitizingPreferencesStorage } from "./sanitizing-storage";

/**
 * AsyncStorage key of the global board / game preferences. One key holds the
 * whole object, the same shape the web keeps in localStorage — but the two
 * stores are independent, nothing syncs between devices or platforms.
 */
export const GAME_PREFERENCES_STORAGE_KEY = "GAME_PREFERENCES";

type GamePreferencesContextValue = {
  preferences: GamePreferences;
  /**
   * `false` until the stored copy has been read (or found absent). Before
   * that `preferences` holds the defaults; a screen that must not flash the
   * default board can wait on it.
   */
  isLoaded: boolean;
  updatePreferences: (updates: Partial<GamePreferences>) => void;
  resetPreferences: () => void;
};

const GamePreferencesContext = createContext<
  GamePreferencesContextValue | undefined
>(undefined);

const preferencesStorage = createSanitizingPreferencesStorage(
  asyncStorageAdapter,
  DEFAULT_GAME_PREFERENCES,
);

/**
 * Holds the player's global board preferences for the whole app. Mounted
 * once in the root layout so the settings tab and every board read and write
 * the same state; per-module practice settings stay in their own
 * `useAsyncStorageSettings` stores.
 */
export function GamePreferencesProvider({ children }: { children: ReactNode }) {
  const { settings, updateSettings, resetSettings, isLoaded } =
    usePersistentSettings<GamePreferences>({
      storageKey: GAME_PREFERENCES_STORAGE_KEY,
      defaults: DEFAULT_GAME_PREFERENCES,
      storage: preferencesStorage,
    });

  const value = useMemo<GamePreferencesContextValue>(
    () => ({
      preferences: settings,
      isLoaded,
      updatePreferences: updateSettings,
      resetPreferences: resetSettings,
    }),
    [settings, isLoaded, updateSettings, resetSettings],
  );

  return (
    <GamePreferencesContext.Provider value={value}>
      {children}
    </GamePreferencesContext.Provider>
  );
}

/** Read and update the global board preferences. */
export function useGamePreferences(): GamePreferencesContextValue {
  const context = useContext(GamePreferencesContext);
  if (!context) {
    throw new Error(
      "useGamePreferences must be used within a GamePreferencesProvider",
    );
  }
  return context;
}
