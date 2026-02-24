import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearMockAsyncStorage } from "../../../../vitest.setup";
import { useLegalMovesSettings } from "./useLegalMovesSettings";

describe("useLegalMovesSettings", () => {
  beforeEach(() => {
    clearMockAsyncStorage();
    vi.clearAllMocks();
  });

  afterEach(() => {
    clearMockAsyncStorage();
  });

  it("returns default settings initially", async () => {
    const { result } = renderHook(() => useLegalMovesSettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.settings.selectedPieces).toBeDefined();
    expect(result.current.settings.timeLimit).toBeDefined();
  });

  it("updates timeLimit via updateTimeLimit", async () => {
    const { result } = renderHook(() => useLegalMovesSettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    await act(async () => {
      result.current.updateTimeLimit(90);
    });

    expect(result.current.settings.timeLimit).toBe(90);
  });

  it("toggles a piece on", async () => {
    const { result } = renderHook(() => useLegalMovesSettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const initialPieces = [...result.current.settings.selectedPieces];
    const allPieces = ["n", "b", "r", "q", "k"] as const;
    const unselected = allPieces.find((p) => !initialPieces.includes(p));

    if (unselected) {
      await act(async () => {
        result.current.togglePiece(unselected);
      });

      expect(result.current.settings.selectedPieces).toContain(unselected);
    }
  });

  it("does not allow deselecting the last piece", async () => {
    const { result } = renderHook(() => useLegalMovesSettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Deselect all but one
    const pieces = [...result.current.settings.selectedPieces];
    for (let i = 1; i < pieces.length; i++) {
      await act(async () => {
        result.current.togglePiece(pieces[i]!);
      });
    }

    expect(result.current.settings.selectedPieces).toHaveLength(1);

    // Try to deselect the last one
    const lastPiece = result.current.settings.selectedPieces[0]!;
    await act(async () => {
      result.current.togglePiece(lastPiece);
    });

    // Should still have 1 piece
    expect(result.current.settings.selectedPieces).toHaveLength(1);
  });

  it("toggles a selected piece off", async () => {
    const { result } = renderHook(() => useLegalMovesSettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    // Default has all 5 pieces selected
    expect(result.current.settings.selectedPieces).toHaveLength(5);

    act(() => {
      result.current.togglePiece("q");
    });

    expect(result.current.settings.selectedPieces).not.toContain("q");
    expect(result.current.settings.selectedPieces).toHaveLength(4);
  });

  it("toggling a piece off and on restores it", async () => {
    const { result } = renderHook(() => useLegalMovesSettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.togglePiece("n");
    });

    expect(result.current.settings.selectedPieces).not.toContain("n");

    act(() => {
      result.current.togglePiece("n");
    });

    expect(result.current.settings.selectedPieces).toContain("n");
  });

  it("preserves timeLimit when toggling pieces", async () => {
    const { result } = renderHook(() => useLegalMovesSettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.updateTimeLimit(120);
    });

    act(() => {
      result.current.togglePiece("q");
    });

    expect(result.current.settings.timeLimit).toBe(120);
    expect(result.current.settings.selectedPieces).not.toContain("q");
  });

  it("resetSettings restores all default pieces and timeLimit", async () => {
    const { result } = renderHook(() => useLegalMovesSettings());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    const defaultPieces = [...result.current.settings.selectedPieces];
    const defaultTimeLimit = result.current.settings.timeLimit;

    act(() => {
      result.current.updateTimeLimit(999);
    });

    act(() => {
      result.current.togglePiece("q");
    });

    act(() => {
      result.current.togglePiece("k");
    });

    act(() => {
      result.current.resetSettings();
    });

    expect(result.current.settings.timeLimit).toBe(defaultTimeLimit);
    expect(result.current.settings.selectedPieces).toEqual(defaultPieces);
  });
});
