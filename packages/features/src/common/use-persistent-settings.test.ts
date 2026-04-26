// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PersistentStorage } from "./persistent-storage";
import { usePersistentSettings } from "./use-persistent-settings";

type TestSettings = Record<string, unknown> & {
  timeLimit: number;
  mode: string;
};

const STORAGE_KEY = "TEST_SETTINGS";
const DEFAULTS: TestSettings = { timeLimit: 60, mode: "timed" };

/** In-memory adapter whose `get`/`set` are both async — stands in for AsyncStorage. */
function createAsyncAdapter(initial: Record<string, string> = {}): {
  adapter: PersistentStorage;
  store: Record<string, string>;
  get: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
} {
  const store: Record<string, string> = { ...initial };
  const get = vi.fn(async (key: string) => store[key] ?? null);
  const set = vi.fn(async (key: string, value: string) => {
    store[key] = value;
  });
  return { adapter: { get, set }, store, get, set };
}

/** In-memory adapter whose `get`/`set` are both sync — stands in for localStorage. */
function createSyncAdapter(initial: Record<string, string> = {}): {
  adapter: PersistentStorage;
  store: Record<string, string>;
  get: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
} {
  const store: Record<string, string> = { ...initial };
  const get = vi.fn((key: string) => store[key] ?? null);
  const set = vi.fn((key: string, value: string) => {
    store[key] = value;
  });
  return { adapter: { get, set }, store, get, set };
}

describe("usePersistentSettings (async adapter)", () => {
  it("starts with defaults and isLoaded=false, then isLoaded=true", async () => {
    const { adapter } = createAsyncAdapter();
    const { result } = renderHook(() =>
      usePersistentSettings({
        storageKey: STORAGE_KEY,
        defaults: DEFAULTS,
        storage: adapter,
      }),
    );

    expect(result.current.settings).toEqual(DEFAULTS);
    expect(result.current.isLoaded).toBe(false);

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });
  });

  it("loads saved settings from storage", async () => {
    const saved: TestSettings = { timeLimit: 30, mode: "untimed" };
    const { adapter } = createAsyncAdapter({
      [STORAGE_KEY]: JSON.stringify(saved),
    });
    const { result } = renderHook(() =>
      usePersistentSettings({
        storageKey: STORAGE_KEY,
        defaults: DEFAULTS,
        storage: adapter,
      }),
    );

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    expect(result.current.settings).toEqual(saved);
  });

  it("merges stored partial over defaults (keeps defaults for missing fields)", async () => {
    // Stored value lacks `mode`; the merge must fill it from defaults so
    // consumers don't see `undefined` for newly-added schema fields.
    const { adapter } = createAsyncAdapter({
      [STORAGE_KEY]: JSON.stringify({ timeLimit: 30 }),
    });
    const { result } = renderHook(() =>
      usePersistentSettings({
        storageKey: STORAGE_KEY,
        defaults: DEFAULTS,
        storage: adapter,
      }),
    );

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    expect(result.current.settings).toEqual({ timeLimit: 30, mode: "timed" });
  });

  it("uses defaults when get() rejects", async () => {
    const { adapter, get } = createAsyncAdapter();
    get.mockRejectedValueOnce(new Error("storage error"));

    const { result } = renderHook(() =>
      usePersistentSettings({
        storageKey: STORAGE_KEY,
        defaults: DEFAULTS,
        storage: adapter,
      }),
    );

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    expect(result.current.settings).toEqual(DEFAULTS);
  });

  it("falls back to defaults when stored JSON is invalid", async () => {
    const { adapter } = createAsyncAdapter({
      [STORAGE_KEY]: "not-valid-json{{{",
    });
    const { result } = renderHook(() =>
      usePersistentSettings({
        storageKey: STORAGE_KEY,
        defaults: DEFAULTS,
        storage: adapter,
      }),
    );

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    expect(result.current.settings).toEqual(DEFAULTS);
  });

  it("partially updates settings via updateSettings and persists the merged result", async () => {
    const { adapter, set } = createAsyncAdapter();
    const { result } = renderHook(() =>
      usePersistentSettings({
        storageKey: STORAGE_KEY,
        defaults: DEFAULTS,
        storage: adapter,
      }),
    );

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    act(() => {
      result.current.updateSettings({ timeLimit: 120 });
    });

    expect(result.current.settings).toEqual({
      timeLimit: 120,
      mode: "timed",
    });
    expect(set).toHaveBeenCalledWith(
      STORAGE_KEY,
      JSON.stringify({ timeLimit: 120, mode: "timed" }),
    );
  });

  it("preserves unspecified fields across multiple updateSettings calls", async () => {
    const { adapter } = createAsyncAdapter();
    const { result } = renderHook(() =>
      usePersistentSettings({
        storageKey: STORAGE_KEY,
        defaults: DEFAULTS,
        storage: adapter,
      }),
    );

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
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

  it("still updates state when set() fails in updateSettings", async () => {
    const { adapter, set } = createAsyncAdapter();
    const { result } = renderHook(() =>
      usePersistentSettings({
        storageKey: STORAGE_KEY,
        defaults: DEFAULTS,
        storage: adapter,
      }),
    );

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    set.mockRejectedValueOnce(new Error("write error"));

    act(() => {
      result.current.updateSettings({ timeLimit: 999 });
    });

    expect(result.current.settings.timeLimit).toBe(999);
  });

  it("resetSettings restores defaults and persists them", async () => {
    const saved: TestSettings = { timeLimit: 30, mode: "untimed" };
    const { adapter, set } = createAsyncAdapter({
      [STORAGE_KEY]: JSON.stringify(saved),
    });
    const { result } = renderHook(() =>
      usePersistentSettings({
        storageKey: STORAGE_KEY,
        defaults: DEFAULTS,
        storage: adapter,
      }),
    );

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    expect(result.current.settings).toEqual(saved);

    set.mockClear();

    act(() => {
      result.current.resetSettings();
    });

    expect(result.current.settings).toEqual(DEFAULTS);
    expect(set).toHaveBeenCalledWith(STORAGE_KEY, JSON.stringify(DEFAULTS));
  });

  it("still resets state when set() fails in resetSettings", async () => {
    const { adapter, set } = createAsyncAdapter();
    const { result } = renderHook(() =>
      usePersistentSettings({
        storageKey: STORAGE_KEY,
        defaults: DEFAULTS,
        storage: adapter,
      }),
    );

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    act(() => {
      result.current.updateSettings({ timeLimit: 999 });
    });
    expect(result.current.settings.timeLimit).toBe(999);

    set.mockRejectedValueOnce(new Error("write error"));

    act(() => {
      result.current.resetSettings();
    });

    expect(result.current.settings).toEqual(DEFAULTS);
  });

  it("uses defaults when storage returns null (key absent)", async () => {
    const { adapter, get } = createAsyncAdapter();
    const { result } = renderHook(() =>
      usePersistentSettings({
        storageKey: STORAGE_KEY,
        defaults: DEFAULTS,
        storage: adapter,
      }),
    );

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    expect(result.current.settings).toEqual(DEFAULTS);
    expect(get).toHaveBeenCalledWith(STORAGE_KEY);
  });
});

describe("usePersistentSettings (sync adapter)", () => {
  it("loads saved settings from a synchronous adapter", async () => {
    const saved: TestSettings = { timeLimit: 15, mode: "untimed" };
    const { adapter } = createSyncAdapter({
      [STORAGE_KEY]: JSON.stringify(saved),
    });
    const { result } = renderHook(() =>
      usePersistentSettings({
        storageKey: STORAGE_KEY,
        defaults: DEFAULTS,
        storage: adapter,
      }),
    );

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    expect(result.current.settings).toEqual(saved);
  });

  it("persists via a synchronous adapter on updateSettings", async () => {
    const { adapter, set } = createSyncAdapter();
    const { result } = renderHook(() =>
      usePersistentSettings({
        storageKey: STORAGE_KEY,
        defaults: DEFAULTS,
        storage: adapter,
      }),
    );

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    act(() => {
      result.current.updateSettings({ timeLimit: 45 });
    });

    expect(result.current.settings.timeLimit).toBe(45);
    expect(set).toHaveBeenCalledWith(
      STORAGE_KEY,
      JSON.stringify({ timeLimit: 45, mode: "timed" }),
    );
  });
});

describe("usePersistentSettings (re-keying)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("re-loads when storageKey changes", async () => {
    const { adapter } = createAsyncAdapter({
      key_a: JSON.stringify({ timeLimit: 10, mode: "timed" }),
      key_b: JSON.stringify({ timeLimit: 20, mode: "untimed" }),
    });

    const { result, rerender } = renderHook(
      ({ storageKey }: { storageKey: string }) =>
        usePersistentSettings({
          storageKey,
          defaults: DEFAULTS,
          storage: adapter,
        }),
      { initialProps: { storageKey: "key_a" } },
    );

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });
    expect(result.current.settings).toEqual({ timeLimit: 10, mode: "timed" });

    rerender({ storageKey: "key_b" });

    await waitFor(() => {
      expect(result.current.settings).toEqual({
        timeLimit: 20,
        mode: "untimed",
      });
    });
  });
});
