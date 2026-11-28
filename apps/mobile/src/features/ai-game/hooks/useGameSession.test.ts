import { act, renderHook, waitFor } from "@testing-library/react";
import { err, ok } from "@blindfold-chess/features/utils";
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

describe("useGameSession actions", () => {
  const never = () => vi.fn().mockReturnValue(new Promise(() => {}));

  it("undo takes back the player's move and the reply to it", async () => {
    const getAiMove = vi.fn().mockResolvedValue(ok("e5" as AlgebraicNotation));
    const { result } = renderHook(() =>
      useGameSession({
        playerColor: "white",
        skillLevel: 5,
        getAiMove,
        isAiLoading: false,
      }),
    );

    expect(result.current.canUndo).toBe(false);
    act(() => {
      result.current.submitMove("e4" as AlgebraicNotation);
    });
    await waitFor(() => expect(result.current.moves).toEqual(["e4", "e5"]));
    await waitFor(() => expect(result.current.canUndo).toBe(true));
    expect(result.current.aiMoveSignal).toBe(1);

    act(() => result.current.undo());
    expect(result.current.moves).toEqual([]);
    expect(result.current.isPlayerTurn).toBe(true);
  });

  it("does not offer undo while the AI is to move", () => {
    const { result } = renderHook(() =>
      useGameSession({
        playerColor: "white",
        skillLevel: 5,
        getAiMove: never(),
        isAiLoading: false,
        initialMoves: san(["e4", "e5", "Nf3"]),
      }),
    );

    expect(result.current.canUndo).toBe(false);
    act(() => result.current.undo());
    expect(result.current.moves).toEqual(["e4", "e5", "Nf3"]);
  });

  it("resigning ends the game as a loss", () => {
    const { result } = renderHook(() =>
      useGameSession({
        playerColor: "white",
        skillLevel: 5,
        getAiMove: never(),
        isAiLoading: false,
      }),
    );

    act(() => result.current.resign());
    expect(result.current.resigned).toBe(true);
    expect(result.current.termination).toBe("resignation");
    expect(result.current.gameStatus).not.toBe("in_progress");
    expect(result.current.playerResult).toBe("loss");
    act(() => {
      expect(result.current.submitMove("e4" as AlgebraicNotation)).toBe(false);
    });
  });

  it("has no termination while the game is being played", () => {
    const { result } = renderHook(() =>
      useGameSession({
        playerColor: "white",
        skillLevel: 5,
        getAiMove: never(),
        isAiLoading: false,
      }),
    );

    expect(result.current.termination).toBeNull();
  });

  it("names a mate on the board as a checkmate, not a resignation", () => {
    const { result } = renderHook(() =>
      useGameSession({
        playerColor: "black",
        skillLevel: 5,
        getAiMove: never(),
        isAiLoading: false,
        initialMoves: san(["f3", "e5", "g4", "Qh4#"]),
      }),
    );

    expect(result.current.termination).toBe("checkmate");
    expect(result.current.playerResult).toBe("win");
  });

  it("reports an invalid move with what was entered", () => {
    const { result } = renderHook(() =>
      useGameSession({
        playerColor: "white",
        skillLevel: 5,
        getAiMove: never(),
        isAiLoading: false,
      }),
    );

    act(() => {
      result.current.submitMove("Ke2" as AlgebraicNotation);
    });
    expect(result.current.error).toEqual({
      kind: "invalid-move",
      input: "Ke2",
    });
  });

  it("clears an invalid move's message when the move is edited", () => {
    const { result } = renderHook(() =>
      useGameSession({
        playerColor: "white",
        skillLevel: 5,
        getAiMove: never(),
        isAiLoading: false,
      }),
    );

    act(() => {
      result.current.submitMove("Ke2" as AlgebraicNotation);
    });
    act(() => result.current.clearInvalidMove());
    expect(result.current.error).toBeNull();
  });

  it("keeps a failed AI move's error when the move is edited", async () => {
    const getAiMove = vi.fn().mockResolvedValue(err({ kind: "no-move" }));
    const { result } = renderHook(() =>
      useGameSession({
        playerColor: "white",
        skillLevel: 5,
        getAiMove,
        isAiLoading: false,
        initialMoves: san(["e4"]),
      }),
    );

    await waitFor(() => expect(result.current.aiMoveFailed).toBe(true));
    act(() => result.current.clearInvalidMove());
    expect(result.current.aiMoveFailed).toBe(true);
  });

  it("stops after a failed AI move and asks again only on retry", async () => {
    const getAiMove = vi
      .fn()
      .mockResolvedValueOnce(err({ kind: "no-move" }))
      .mockResolvedValueOnce(ok("e5" as AlgebraicNotation));
    const resetAi = vi.fn();
    const { result, rerender } = renderHook(() =>
      useGameSession({
        playerColor: "white",
        skillLevel: 5,
        getAiMove,
        isAiLoading: false,
        resetAi,
        initialMoves: san(["e4"]),
      }),
    );

    await waitFor(() => expect(result.current.aiMoveFailed).toBe(true));
    await waitFor(() => expect(result.current.isAiThinking).toBe(false));
    rerender();
    expect(getAiMove).toHaveBeenCalledTimes(1);

    act(() => result.current.retryAiMove());
    expect(resetAi).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(result.current.moves).toEqual(["e4", "e5"]));
    expect(result.current.aiMoveFailed).toBe(false);
  });
});
