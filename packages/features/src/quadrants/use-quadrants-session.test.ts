// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { QuadrantId } from "./types";
import { getCorrectQuadrant } from "./logic";
import { useQuadrantsSession } from "./use-quadrants-session";

// One act() per countdown tick so React flushes between 3→2→1→0→null.
function advancePastCountdown() {
  act(() => vi.advanceTimersByTime(1000));
  act(() => vi.advanceTimersByTime(1000));
  act(() => vi.advanceTimersByTime(1000));
  act(() => vi.advanceTimersByTime(500));
}

const ALL_QUADRANTS: QuadrantId[] = ["q1", "q2", "q3", "q4"];

describe("useQuadrantsSession", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("serves questions in the requested orientation", () => {
    const { result } = renderHook(() =>
      useQuadrantsSession({ orientation: "black", timeLimit: 60 }),
    );
    advancePastCountdown();

    expect(result.current.currentQuestion?.orientation).toBe("black");
  });

  it("marks only the correct quadrant after a right answer", () => {
    const { result } = renderHook(() =>
      useQuadrantsSession({ orientation: "white", timeLimit: 60 }),
    );
    advancePastCountdown();
    const correct = getCorrectQuadrant(result.current.currentQuestion!.square);

    act(() => result.current.handleAnswer(correct));

    expect(result.current.correctCount).toBe(1);
    expect(result.current.correctQuadrant).toBe(correct);
    expect(result.current.wrongQuadrant).toBeNull();
  });

  it("marks both the correct and the picked quadrant after a wrong answer", () => {
    const { result } = renderHook(() =>
      useQuadrantsSession({ orientation: "white", timeLimit: 60 }),
    );
    advancePastCountdown();
    const correct = getCorrectQuadrant(result.current.currentQuestion!.square);
    const wrong = ALL_QUADRANTS.find((q) => q !== correct)!;

    act(() => result.current.handleAnswer(wrong));

    expect(result.current.incorrectCount).toBe(1);
    expect(result.current.correctQuadrant).toBe(correct);
    expect(result.current.wrongQuadrant).toBe(wrong);

    // A wrong answer's feedback outlasts the default 500 ms flash.
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.showFeedback).toBe(true);
    act(() => vi.advanceTimersByTime(500));
    expect(result.current.showFeedback).toBe(false);
    expect(result.current.correctQuadrant).toBeNull();
    expect(result.current.wrongQuadrant).toBeNull();
  });

  it("reports the result once the mistake allowance is used up", () => {
    const onComplete = vi.fn();
    const { result } = renderHook(() =>
      useQuadrantsSession({
        orientation: "white",
        timeLimit: 60,
        mistakeAllowance: 1,
        onComplete,
      }),
    );
    advancePastCountdown();
    const correct = getCorrectQuadrant(result.current.currentQuestion!.square);
    const wrong = ALL_QUADRANTS.find((q) => q !== correct)!;

    act(() => result.current.handleAnswer(wrong));
    act(() => vi.advanceTimersByTime(1500));

    expect(result.current.isFinished).toBe(true);
    expect(onComplete).toHaveBeenCalledTimes(1);
    expect(onComplete.mock.calls[0][0]).toMatchObject({
      correctAnswers: 0,
      incorrectAnswers: 1,
    });
  });
});
