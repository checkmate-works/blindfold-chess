import { act, renderHook, waitFor } from "@testing-library/react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearMockAsyncStorage } from "../../vitest.setup";
import { usePersistentSettings } from "./usePersistentSettings";

type TestSettings = {
  timeLimit: number;
  mode: string;
};

const STORAGE_KEY = "TEST_SETTINGS";
const DEFAULTS: TestSettings = { timeLimit: 60, mode: "timed" };

describe("usePersistentSettings", () => {
  beforeEach(() => {
    clearMockAsyncStorage();
    vi.clearAllMocks();
  });

  afterEach(() => {
    clearMockAsyncStorage();
  });

  it("returns defaults and isLoading=true initially, then isLoading=false after loading", async () => {
    const { result } = renderHook(() =>
      usePersistentSettings(STORAGE_KEY, DEFAULTS),
    );

    expect(result.current.settings).toEqual(DEFAULTS);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
  });

  it("loads saved settings from AsyncStorage", async () => {
    const saved: TestSettings = { timeLimit: 30, mode: "untimed" };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(saved));

    const { result } = renderHook(() =>
      usePersistentSettings(STORAGE_KEY, DEFAULTS),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.settings).toEqual(saved);
  });

  it("uses defaults when AsyncStorage.getItem rejects", async () => {
    (AsyncStorage.getItem as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("storage error"),
    );

    const { result } = renderHook(() =>
      usePersistentSettings(STORAGE_KEY, DEFAULTS),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.settings).toEqual(DEFAULTS);
  });

  it("partially updates settings via updateSettings", async () => {
    const { result } = renderHook(() =>
      usePersistentSettings(STORAGE_KEY, DEFAULTS),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.updateSettings({ timeLimit: 120 });
    });

    expect(result.current.settings.timeLimit).toBe(120);
    expect(result.current.settings.mode).toBe("timed");
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      STORAGE_KEY,
      JSON.stringify({ timeLimit: 120, mode: "timed" }),
    );
  });

  it("saves settings to AsyncStorage via saveSettings", async () => {
    const { result } = renderHook(() =>
      usePersistentSettings(STORAGE_KEY, DEFAULTS),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const newSettings: TestSettings = { timeLimit: 120, mode: "untimed" };
    await act(async () => {
      await result.current.saveSettings(newSettings);
    });

    expect(result.current.settings).toEqual(newSettings);
    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      STORAGE_KEY,
      JSON.stringify(newSettings),
    );
  });

  it("resets settings to defaults via resetSettings", async () => {
    const saved: TestSettings = { timeLimit: 30, mode: "untimed" };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(saved));

    const { result } = renderHook(() =>
      usePersistentSettings(STORAGE_KEY, DEFAULTS),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.settings).toEqual(saved);

    await act(async () => {
      result.current.resetSettings();
    });

    expect(result.current.settings).toEqual(DEFAULTS);
  });

  it("falls back to defaults when stored JSON is invalid", async () => {
    await AsyncStorage.setItem(STORAGE_KEY, "not-valid-json{{{");

    const { result } = renderHook(() =>
      usePersistentSettings(STORAGE_KEY, DEFAULTS),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.settings).toEqual(DEFAULTS);
  });

  it("still updates state when AsyncStorage.setItem fails in updateSettings", async () => {
    const { result } = renderHook(() =>
      usePersistentSettings(STORAGE_KEY, DEFAULTS),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    (AsyncStorage.setItem as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("write error"),
    );

    act(() => {
      result.current.updateSettings({ timeLimit: 999 });
    });

    expect(result.current.settings.timeLimit).toBe(999);
  });

  it("does not update state when saveSettings fails", async () => {
    const { result } = renderHook(() =>
      usePersistentSettings(STORAGE_KEY, DEFAULTS),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    (AsyncStorage.setItem as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("write error"),
    );

    await act(async () => {
      await result.current.saveSettings({ timeLimit: 999, mode: "untimed" });
    });

    expect(result.current.settings).toEqual(DEFAULTS);
  });

  it("still resets state when AsyncStorage.setItem fails in resetSettings", async () => {
    const { result } = renderHook(() =>
      usePersistentSettings(STORAGE_KEY, DEFAULTS),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.updateSettings({ timeLimit: 999 });
    });

    expect(result.current.settings.timeLimit).toBe(999);

    (AsyncStorage.setItem as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("write error"),
    );

    act(() => {
      result.current.resetSettings();
    });

    expect(result.current.settings).toEqual(DEFAULTS);
  });

  it("preserves unspecified fields across multiple updateSettings calls", async () => {
    const { result } = renderHook(() =>
      usePersistentSettings(STORAGE_KEY, DEFAULTS),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.updateSettings({ timeLimit: 120 });
    });

    act(() => {
      result.current.updateSettings({ mode: "untimed" });
    });

    expect(result.current.settings).toEqual({
      timeLimit: 120,
      mode: "untimed",
    });
  });

  it("resetSettings persists defaults to AsyncStorage", async () => {
    const { result } = renderHook(() =>
      usePersistentSettings(STORAGE_KEY, DEFAULTS),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.updateSettings({ timeLimit: 999 });
    });

    vi.clearAllMocks();

    act(() => {
      result.current.resetSettings();
    });

    expect(AsyncStorage.setItem).toHaveBeenCalledWith(
      STORAGE_KEY,
      JSON.stringify(DEFAULTS),
    );
  });

  it("uses empty stored value (null) as defaults", async () => {
    // getItem returns null when key doesn't exist - verify defaults are used
    const { result } = renderHook(() =>
      usePersistentSettings(STORAGE_KEY, DEFAULTS),
    );

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.settings).toEqual(DEFAULTS);
    // getItem was called but returned null
    expect(AsyncStorage.getItem).toHaveBeenCalledWith(STORAGE_KEY);
  });
});
