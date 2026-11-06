import { act, renderHook, waitFor } from "@testing-library/react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { describe, expect, it } from "vitest";
import { useQuadrantsSettings } from "./useQuadrantsSettings";

describe("useQuadrantsSettings", () => {
  it("starts from a white board", async () => {
    const { result } = renderHook(() => useQuadrantsSettings());

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    expect(result.current.settings.orientation).toBe("white");
  });

  it("persists the chosen orientation", async () => {
    const { result } = renderHook(() => useQuadrantsSettings());

    await waitFor(() => {
      expect(result.current.isLoaded).toBe(true);
    });

    await act(async () => {
      result.current.updateSettings({ orientation: "random" });
    });

    expect(result.current.settings.orientation).toBe("random");
    expect(AsyncStorage.setItem).toHaveBeenCalled();
  });
});
