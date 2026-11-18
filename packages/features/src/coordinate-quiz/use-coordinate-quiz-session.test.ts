// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  ChallengeAnswerResponse,
  RemoteChallengePort,
} from "../challenge-attempt/types";
import type { CoordinateQuestion } from "./types";
import { useCoordinateQuizSession } from "./use-coordinate-quiz-session";

function advancePastCountdown() {
  act(() => vi.advanceTimersByTime(1000));
  act(() => vi.advanceTimersByTime(1000));
  act(() => vi.advanceTimersByTime(1000));
  act(() => vi.advanceTimersByTime(500));
}

describe("useCoordinateQuizSession", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the server's first question and sends the tapped square to submitAnswer", () => {
    const first: CoordinateQuestion = {
      targetSquare: "c6",
      orientation: "black",
    };
    const submitAnswer = vi.fn(
      () => new Promise<ChallengeAnswerResponse<CoordinateQuestion>>(() => {}),
    );
    const remote: RemoteChallengePort<CoordinateQuestion> = {
      first: { sequence: 0, question: first },
      submitAnswer,
    };

    const { result } = renderHook(() =>
      useCoordinateQuizSession({
        timeLimit: 60,
        orientation: "white",
        feedbackSpeed: "normal",
        remote,
        disablePause: true,
      }),
    );

    expect(result.current.currentQuestion).toEqual(first);
    advancePastCountdown();

    act(() => result.current.handleAnswer("c6"));

    expect(submitAnswer).toHaveBeenCalledWith(0, "c6");
    expect(result.current.correctCount).toBe(1);
  });

  it("grades locally without a remote port", () => {
    const { result } = renderHook(() =>
      useCoordinateQuizSession({
        timeLimit: 60,
        orientation: "white",
        feedbackSpeed: "normal",
      }),
    );
    advancePastCountdown();

    const target = result.current.currentQuestion!.targetSquare;
    act(() => result.current.handleAnswer(target));

    expect(result.current.correctCount).toBe(1);
    expect(result.current.incorrectCount).toBe(0);
  });

  it("ignores togglePause when disablePause is set", () => {
    const { result } = renderHook(() =>
      useCoordinateQuizSession({
        timeLimit: 60,
        orientation: "white",
        feedbackSpeed: "normal",
        disablePause: true,
      }),
    );
    advancePastCountdown();

    act(() => result.current.togglePause());

    expect(result.current.isPaused).toBe(false);
  });
});
