import { act, renderHook, waitFor } from "@testing-library/react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { describe, expect, it } from "vitest";
import { DEFAULT_FEN_SETTINGS } from "@blindfold-chess/features/fen-practice";

import { useFenSettings } from "./useFenSettings";

describe("useFenSettings", () => {
  it("starts from the shared defaults", async () => {
    const { result } = renderHook(() => useFenSettings());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));
    expect(result.current.settings).toEqual(DEFAULT_FEN_SETTINGS);
  });

  it("persists an update", async () => {
    const { result } = renderHook(() => useFenSettings());
    await waitFor(() => expect(result.current.isLoaded).toBe(true));

    await act(async () => {
      result.current.updateSettings({ useCustomFen: true, problemCount: 2 });
    });

    expect(result.current.settings.useCustomFen).toBe(true);
    expect(result.current.settings.problemCount).toBe(2);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      "FEN_PRACTICE_SETTINGS",
      expect.any(String),
    );
  });
});
