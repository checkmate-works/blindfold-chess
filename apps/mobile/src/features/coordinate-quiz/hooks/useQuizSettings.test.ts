import { act, renderHook, waitFor } from "@testing-library/react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearMockAsyncStorage } from "../../../../vitest.setup";
import { useQuizSettings } from "./useQuizSettings";

describe("useQuizSettings", () => {
  beforeEach(() => {
    clearMockAsyncStorage();
    vi.clearAllMocks();
  });

  afterEach(() => {
    clearMockAsyncStorage();
  });

  it("returns default settings initially", async () => {
    const { result } = renderHook(() => useQuizSettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.settings).toBeDefined();
  });

  it("updates a single setting via updateSetting", async () => {
    const { result } = renderHook(() => useQuizSettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const originalTimeLimit = result.current.settings.timeLimit;

    await act(async () => {
      result.current.updateSetting("timeLimit", originalTimeLimit + 30);
    });

    expect(result.current.settings.timeLimit).toBe(originalTimeLimit + 30);
    expect(AsyncStorage.setItem).toHaveBeenCalled();
  });

  it("resets settings to defaults", async () => {
    const { result } = renderHook(() => useQuizSettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const defaultTimeLimit = result.current.settings.timeLimit;

    await act(async () => {
      result.current.updateSetting("timeLimit", 999);
    });

    await act(async () => {
      result.current.resetSettings();
    });

    expect(result.current.settings.timeLimit).toBe(defaultTimeLimit);
  });
});
