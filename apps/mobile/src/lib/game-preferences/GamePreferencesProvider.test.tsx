import { createElement, type ReactNode } from "react";
import { act, renderHook, waitFor } from "@testing-library/react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { describe, expect, it } from "vitest";
import { DEFAULT_GAME_PREFERENCES } from "@blindfold-chess/features/game-preferences";

import {
  GAME_PREFERENCES_STORAGE_KEY,
  GamePreferencesProvider,
  useGamePreferences,
} from "./GamePreferencesProvider";

function wrapper({ children }: { children: ReactNode }) {
  return createElement(GamePreferencesProvider, null, children);
}

describe("GamePreferencesProvider", () => {
  it("starts from the defaults when nothing is stored", async () => {
    const { result } = renderHook(() => useGamePreferences(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.preferences).toEqual(DEFAULT_GAME_PREFERENCES);
  });

  it("loads a stored payload through the shared sanitiser", async () => {
    await AsyncStorage.setItem(
      GAME_PREFERENCES_STORAGE_KEY,
      JSON.stringify({ showCoordinates: false, pieceColors: "purple" }),
    );
    const { result } = renderHook(() => useGamePreferences(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.preferences).toEqual({
      ...DEFAULT_GAME_PREFERENCES,
      showCoordinates: false,
    });
  });

  it("persists updates under the single storage key", async () => {
    const { result } = renderHook(() => useGamePreferences(), { wrapper });
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    act(() => result.current.updatePreferences({ boardVisibility: "always" }));
    expect(result.current.preferences.boardVisibility).toBe("always");
    await waitFor(async () => {
      const raw = await AsyncStorage.getItem(GAME_PREFERENCES_STORAGE_KEY);
      expect(JSON.parse(raw as string).boardVisibility).toBe("always");
    });
  });

  it("throws outside the provider", () => {
    expect(() => renderHook(() => useGamePreferences())).toThrow(
      /GamePreferencesProvider/,
    );
  });
});
