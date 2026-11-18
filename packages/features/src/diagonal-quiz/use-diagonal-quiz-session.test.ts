// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { Square } from "@blindfold-chess/types";

import type {
  ChallengeAnswerResponse,
  RemoteChallengePort,
} from "../challenge-attempt/types";
import { FEEDBACK_FLASH_MS } from "../common/flash-policy";
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

describe("useDiagonalQuizSession remote challenge", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("replaces an expired optimistic answer with a single unanswered detail", async () => {
    const { result } = renderHook(() =>
      useDiagonalQuizSession({
        timeLimit: 60,
        remote: {
          first: { sequence: 0, question: "d4" },
          submitAnswer: async () => ({ status: "expired" }),
        },
      }),
    );
    advancePastCountdown();
    const correct = getDiagonals("d4");
    await act(async () =>
      result.current.handleAnswer(correct.diagonal, correct.antiDiagonal),
    );
    expect(result.current.correctCount).toBe(0);
    expect(result.current.questionResults).toHaveLength(1);
    expect(result.current.questionResults[0]).toMatchObject({
      square: "d4",
      timedOut: true,
      isCorrect: false,
    });
  });

  it("shows the server's first square, sends both typed diagonals, and moves to the server's next square", async () => {
    const submitAnswer = vi.fn(
      async (): Promise<ChallengeAnswerResponse<Square>> => ({
        status: "accepted",
        correct: false,
        elapsedMs: 2000,
        next: { sequence: 1, question: "e5" },
      }),
    );
    const port: RemoteChallengePort<Square> = {
      first: { sequence: 0, question: "d4" },
      submitAnswer,
    };
    const { result } = renderHook(() =>
      useDiagonalQuizSession({
        timeLimit: 60,
        remote: port,
        disablePause: true,
      }),
    );

    expect(result.current.currentSquare).toBe("d4");
    advancePastCountdown();

    await act(async () => {
      result.current.handleAnswer("a1-h8", "nonsense");
    });

    expect(submitAnswer).toHaveBeenCalledWith(0, {
      diagonal: "a1-h8",
      antiDiagonal: "nonsense",
    });
    expect(result.current.incorrectCount).toBe(1);

    act(() => vi.advanceTimersByTime(FEEDBACK_FLASH_MS.incorrect));
    expect(result.current.currentSquare).toBe("e5");

    act(() => result.current.togglePause());
    expect(result.current.isPaused).toBe(false);
  });
});
