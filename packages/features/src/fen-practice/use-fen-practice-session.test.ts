// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { EMPTY_BOARD_FEN } from "./board-edit";
import { useFenPracticeSession } from "./use-fen-practice-session";

const POSITIONS = [
  { fen: "8/8/8/8/8/8/8/K6k w - - 0 1", isBlackToMove: false },
  { fen: "8/8/8/8/8/8/8/k6K b - - 0 1", isBlackToMove: true },
];
const NAMES: Record<string, string> = {};
const DESC = {
  correct: () => "",
  wrongPiece: () => "",
  missing: () => "",
  extra: () => "",
};

function render() {
  return renderHook(() =>
    useFenPracticeSession({
      positions: POSITIONS,
      pieceNames: NAMES,
      accuracyDescriptions: DESC,
    }),
  );
}

describe("useFenPracticeSession", () => {
  it("starts on the first problem with an empty board", () => {
    const { result } = render();
    expect(result.current.phase).toBe("recreate");
    expect(result.current.originalPosition).toEqual(POSITIONS[0]);
    expect(result.current.recreatedPosition).toBe(EMPTY_BOARD_FEN);
  });

  it("scores a submission and moves to the next problem", () => {
    const { result } = render();
    act(() => result.current.setRecreatedPosition(POSITIONS[0].fen));
    act(() => result.current.submit());

    expect(result.current.phase).toBe("problem-result");
    expect(result.current.currentAccuracy?.accuracy).toBe(100);
    expect(result.current.recreatedPositions.get(0)).toBe(POSITIONS[0].fen);

    act(() => result.current.nextProblem());
    expect(result.current.phase).toBe("recreate");
    expect(result.current.currentProblemIndex).toBe(1);
    expect(result.current.recreatedPosition).toBe(EMPTY_BOARD_FEN);
    expect(result.current.currentAccuracy).toBeNull();
  });

  it("skips forward, and ends the session when skipping the last problem", () => {
    const { result } = render();
    let advanced = false;
    act(() => {
      advanced = result.current.skip();
    });
    expect(advanced).toBe(true);
    expect(result.current.currentProblemIndex).toBe(1);

    act(() => {
      advanced = result.current.skip();
    });
    expect(advanced).toBe(false);
    expect(result.current.phase).toBe("result");
    expect([...result.current.skippedProblems]).toEqual([0, 1]);
  });

  it("finishes early", () => {
    const { result } = render();
    act(() => result.current.finish());
    expect(result.current.phase).toBe("result");
  });
});
