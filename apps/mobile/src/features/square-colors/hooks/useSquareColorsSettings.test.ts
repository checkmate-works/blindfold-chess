import { act, renderHook, waitFor } from "@testing-library/react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearMockAsyncStorage } from "../../../../vitest.setup";
import { useSquareColorsSettings } from "./useSquareColorsSettings";

describe("useSquareColorsSettings", () => {
  beforeEach(() => {
    clearMockAsyncStorage();
    vi.clearAllMocks();
  });

  afterEach(() => {
    clearMockAsyncStorage();
  });

  it("returns default settings initially", async () => {
    const { result } = renderHook(() => useSquareColorsSettings());

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    expect(result.current.settings.timeLimit).toBeDefined();
  });

  it("updates timeLimit via updateSettings", async () => {
    const { result } = renderHook(() => useSquareColorsSettings());

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    await act(async () => {
      result.current.updateSettings({ timeLimit: 120 });
    });

    expect(result.current.settings.timeLimit).toBe(120);
    expect(AsyncStorage.setItem).toHaveBeenCalled();
  });

  it("resets settings to defaults", async () => {
    const { result } = renderHook(() => useSquareColorsSettings());

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    await act(async () => {
      result.current.updateSettings({ timeLimit: 999 });
    });

    await act(async () => {
      result.current.resetSettings();
    });

    expect(result.current.settings.timeLimit).not.toBe(999);
  });
});
