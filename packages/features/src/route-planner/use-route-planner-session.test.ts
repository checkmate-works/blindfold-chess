// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type {
  ChallengeAnswerResponse,
  RemoteChallengePort,
} from "../challenge-attempt/types";
import { FEEDBACK_FLASH_MS } from "../common/flash-policy";
import type { RoutePlannerProblem } from "./types";
import { useRoutePlannerSession } from "./use-route-planner-session";

// One act() per countdown tick so React flushes between 3→2→1→0→null.
function advancePastCountdown() {
  act(() => vi.advanceTimersByTime(1000));
  act(() => vi.advanceTimersByTime(1000));
  act(() => vi.advanceTimersByTime(1000));
  act(() => vi.advanceTimersByTime(500));
}

const first: RoutePlannerProblem = { piece: "n", start: "b1", end: "d5" };
const second: RoutePlannerProblem = { piece: "n", start: "g1", end: "e4" };
const third: RoutePlannerProblem = { piece: "n", start: "a1", end: "c4" };

describe("useRoutePlannerSession remote challenge", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function createPort() {
    const nexts = [
      { sequence: 1, question: second },
      { sequence: 2, question: third },
    ];
    const submitAnswer = vi.fn(
      async (
        sequence: number,
      ): Promise<ChallengeAnswerResponse<RoutePlannerProblem>> => ({
        status: "accepted",
        correct: sequence === 0,
        elapsedMs: 1000 * (sequence + 1),
        next: nexts[sequence] ?? null,
      }),
    );
    const port: RemoteChallengePort<RoutePlannerProblem> = {
      first: { sequence: 0, question: first },
      submitAnswer,
    };
    return { port, submitAnswer };
  }

  it("omits an expired optimistic path from the completion result", async () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useRoutePlannerSession({
        selectedPieces: ["n"],
        timeLimit: 60,
        onComplete,
        remote: {
          first: { sequence: 0, question: first },
          submitAnswer: async () => ({ status: "expired" }),
        },
      }),
    );
    advancePastCountdown();
    await act(async () => result.current.handleAnswer(true, ["c3", "d5"]));
    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({
        problems: [],
        totalProblems: 0,
        correctCount: 0,
      }),
    );
  });

  it("shows the server's first problem and sends the entered path, then a skip, as raw answers", async () => {
    const { port, submitAnswer } = createPort();
    const { result } = renderHook(() =>
      useRoutePlannerSession({
        selectedPieces: ["n"],
        timeLimit: 60,
        remote: port,
      }),
    );

    expect(result.current.currentProblem).toEqual(first);
    advancePastCountdown();

    await act(async () => {
      result.current.handleAnswer(true, ["c3", "d5"]);
    });
    expect(submitAnswer).toHaveBeenLastCalledWith(0, { path: ["c3", "d5"] });

    act(() => vi.advanceTimersByTime(FEEDBACK_FLASH_MS.correct));
    expect(result.current.currentProblem).toEqual(second);

    await act(async () => {
      result.current.handleSkip();
    });
    expect(submitAnswer).toHaveBeenLastCalledWith(1, { skipped: true });

    act(() => vi.advanceTimersByTime(FEEDBACK_FLASH_MS.incorrect));
    expect(result.current.currentProblem).toEqual(third);
    expect(result.current.correctCount).toBe(1);
    expect(result.current.incorrectCount).toBe(1);
  });

  it("ignores pause requests when disablePause is set", () => {
    const { port } = createPort();
    const { result } = renderHook(() =>
      useRoutePlannerSession({
        selectedPieces: ["n"],
        timeLimit: 60,
        remote: port,
        disablePause: true,
      }),
    );
    advancePastCountdown();

    act(() => result.current.togglePause());

    expect(result.current.isPaused).toBe(false);
  });
});
