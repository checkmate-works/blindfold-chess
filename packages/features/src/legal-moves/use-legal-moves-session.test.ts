// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  ChallengeAnswerResponse,
  RemoteChallengePort,
} from "../challenge-attempt/types";
import type { MoveQuestion } from "./types";
import { useLegalMovesSession } from "./use-legal-moves-session";

function advancePastCountdown() {
  act(() => vi.advanceTimersByTime(1000));
  act(() => vi.advanceTimersByTime(1000));
  act(() => vi.advanceTimersByTime(1000));
  act(() => vi.advanceTimersByTime(500));
}

describe("useLegalMovesSession", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the server's first question and sends the player's claim to submitAnswer", () => {
    const first: MoveQuestion = { from: "a1", to: "a8", piece: "r" };
    const submitAnswer = vi.fn(
      () => new Promise<ChallengeAnswerResponse<MoveQuestion>>(() => {}),
    );
    const remote: RemoteChallengePort<MoveQuestion> = {
      first: { sequence: 0, question: first },
      submitAnswer,
    };

    const { result } = renderHook(() =>
      useLegalMovesSession({
        timeLimit: 60,
        selectedPieces: ["k"],
        remote,
        disablePause: true,
      }),
    );

    expect(result.current.currentQuestion).toEqual(first);
    advancePastCountdown();

    act(() => result.current.handleAnswer(true));

    expect(submitAnswer).toHaveBeenCalledWith(0, true);
    expect(result.current.correctCount).toBe(1);
  });

  it("ignores togglePause when disablePause is set", () => {
    const { result } = renderHook(() =>
      useLegalMovesSession({
        timeLimit: 60,
        selectedPieces: ["k"],
        disablePause: true,
      }),
    );
    advancePastCountdown();

    act(() => result.current.togglePause());

    expect(result.current.isPaused).toBe(false);
  });
});
