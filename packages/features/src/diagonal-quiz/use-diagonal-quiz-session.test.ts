// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getDiagonals } from "./logic";
import { useDiagonalQuizSession } from "./use-diagonal-quiz-session";

// One act() per countdown tick so React flushes between 3→2→1→0→null.
function advancePastCountdown() {
  act(() => vi.advanceTimersByTime(1000));
  act(() => vi.advanceTimersByTime(1000));
  act(() => vi.advanceTimersByTime(1000));
  act(() => vi.advanceTimersByTime(500));
}

describe("useDiagonalQuizSession questionResults", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const render = () =>
    renderHook(() =>
      useDiagonalQuizSession({ timeLimit: 60, mistakeAllowance: 1 }),
    );

  it("appends the unanswered question as timedOut when the time limit ends the run", () => {
    const { result } = render();
    advancePastCountdown();
    const square = result.current.currentSquare!;

    act(() => {
      vi.advanceTimersByTime(60 * 1000);
    });

    const { diagonal, antiDiagonal } = getDiagonals(square);
    expect(result.current.isFinished).toBe(true);
    expect(result.current.questionResults).toEqual([
      {
        square,
        isCorrect: false,
        isDiagonalCorrect: false,
        isAntiDiagonalCorrect: false,
        correctDiagonal: diagonal,
        correctAntiDiagonal: antiDiagonal,
        timedOut: true,
      },
    ]);
    // The timed-out question is not scored.
    expect(result.current.incorrectCount).toBe(0);
  });

  it("adds no timedOut entry when the mistake limit ends the run", () => {
    const { result } = render();
    advancePastCountdown();

    act(() => {
      result.current.handleAnswer("a1-a1", "a1-a1");
    });
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    expect(result.current.isFinished).toBe(true);
    expect(result.current.questionResults).toHaveLength(1);
    expect(result.current.questionResults[0].timedOut).toBeUndefined();
  });

  it("adds no timedOut entry when the player quits", () => {
    const { result } = render();
    advancePastCountdown();

    act(() => {
      result.current.finishSession();
    });

    expect(result.current.isFinished).toBe(true);
    expect(result.current.questionResults).toEqual([]);
  });
});
