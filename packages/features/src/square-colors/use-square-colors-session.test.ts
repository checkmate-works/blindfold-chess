// @vitest-environment jsdom
import type { Square } from "@blindfold-chess/types";
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  ChallengeAnswerResponse,
  RemoteChallengePort,
} from "../challenge-attempt/types";
import { useSquareColorsSession } from "./use-square-colors-session";

function advancePastCountdown() {
  act(() => vi.advanceTimersByTime(1000));
  act(() => vi.advanceTimersByTime(1000));
  act(() => vi.advanceTimersByTime(1000));
  act(() => vi.advanceTimersByTime(500));
}

describe("useSquareColorsSession", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the server's first square and sends the picked colour to submitAnswer", () => {
    const submitAnswer = vi.fn(
      () => new Promise<ChallengeAnswerResponse<Square>>(() => {}),
    );
    const remote: RemoteChallengePort<Square> = {
      first: { sequence: 0, question: "h1" },
      submitAnswer,
    };

    const { result } = renderHook(() =>
      useSquareColorsSession({ timeLimit: 60, remote, disablePause: true }),
    );

    expect(result.current.currentSquare).toBe("h1");
    advancePastCountdown();

    // h1 is a light square, so "dark" is sent as given and counted wrong.
    act(() => result.current.handleAnswer("dark"));

    expect(submitAnswer).toHaveBeenCalledWith(0, "dark");
    expect(result.current.incorrectCount).toBe(1);
  });

  it("ignores togglePause when disablePause is set", () => {
    const { result } = renderHook(() =>
      useSquareColorsSession({ timeLimit: 60, disablePause: true }),
    );
    advancePastCountdown();

    act(() => result.current.togglePause());

    expect(result.current.isPaused).toBe(false);
  });
});
