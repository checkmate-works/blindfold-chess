import { act, renderHook, waitFor } from "@testing-library/react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearMockAsyncStorage } from "../../../../vitest.setup";
import { useGameSettings } from "./useGameSettings";

describe("useGameSettings", () => {
  beforeEach(() => {
    clearMockAsyncStorage();
    vi.clearAllMocks();
  });

  afterEach(() => {
    clearMockAsyncStorage();
  });

  it("returns isLoaded=false initially, then isLoaded=true after loading", async () => {
    const { result } = renderHook(() => useGameSettings());

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });
  });

  it("updates player color via updateSettings", async () => {
    const { result } = renderHook(() => useGameSettings());

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    await act(async () => {
      result.current.updateSettings({ playerColor: "black" });
    });

    expect(result.current.settings.playerColor).toBe("black");
    expect(AsyncStorage.setItem).toHaveBeenCalled();
  });

  it("updates skill level via updateSettings", async () => {
    const { result } = renderHook(() => useGameSettings());

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    await act(async () => {
      result.current.updateSettings({ skillLevel: 10 });
    });

    expect(result.current.settings.skillLevel).toBe(10);
    expect(AsyncStorage.setItem).toHaveBeenCalled();
  });
});
