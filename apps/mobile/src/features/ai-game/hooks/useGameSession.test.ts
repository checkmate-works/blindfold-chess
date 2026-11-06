import { act, renderHook, waitFor } from "@testing-library/react";
import { ok } from "@blindfold-chess/features/utils";
import type { AlgebraicNotation } from "@blindfold-chess/types";
import { describe, expect, it, vi } from "vitest";

vi.mock("expo-haptics", () => ({
  notificationAsync: vi.fn(),
  NotificationFeedbackType: { Success: "success", Error: "error" },
}));

import { useGameSession } from "./useGameSession";

const san = (moves: string[]) => moves as AlgebraicNotation[];

describe("useGameSession with a custom start", () => {
  it("replays the initial moves and lets the player move when it is their turn", () => {
    const getAiMove = vi.fn();
    const { result } = renderHook(() =>
      useGameSession({
        playerColor: "white",
        skillLevel: 5,
        getAiMove,
        isAiLoading: false,
        initialMoves: san(["e4", "e5"]),
      }),
    );

    expect(result.current.moves).toEqual(["e4", "e5"]);
    expect(result.current.isPlayerTurn).toBe(true);
    expect(getAiMove).not.toHaveBeenCalled();
  });

  it("has the engine move first from a FEN where the engine is to move", async () => {
    const fen = "4k3/8/8/8/8/8/4P3/4K3 w - - 0 1";
    const getAiMove = vi.fn().mockResolvedValue(ok("e4" as AlgebraicNotation));
    const { result } = renderHook(() =>
      useGameSession({
        playerColor: "black",
        skillLevel: 5,
        getAiMove,
        isAiLoading: false,
        startingFen: fen,
      }),
    );

    await waitFor(() => expect(result.current.moves).toEqual(["e4"]));
    expect(getAiMove).toHaveBeenCalledWith([], fen);
    expect(result.current.isPlayerTurn).toBe(true);
  });

  it("validates the player's move against the starting FEN", async () => {
    const fen = "4k3/8/8/8/8/8/4P3/4K3 b - - 0 1";
    const { result } = renderHook(() =>
      useGameSession({
        playerColor: "black",
        skillLevel: 5,
        // Never settles: the engine reply is not under test here.
        getAiMove: vi.fn().mockReturnValue(new Promise(() => {})),
        isAiLoading: false,
        startingFen: fen,
      }),
    );

    // Legal from the standard position, but there is no black pawn here.
    act(() => {
      expect(result.current.submitMove("e5" as AlgebraicNotation)).toBe(false);
    });
    act(() => {
      expect(result.current.submitMove("Kd7" as AlgebraicNotation)).toBe(true);
    });
    expect(result.current.moves).toEqual(["Kd7"]);
  });
});
