// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { FEEDBACK_FLASH_MS } from "../common";
import { useTimedSession } from "../practice-session/use-timed-session";
import { calculateSymmetricSquare } from "./logic";
import type { BoardSymmetryProblem } from "./types";
import { useBoardSymmetrySession } from "./use-board-symmetry-session";

/**
 * Regression tests for the board-symmetry "hearts decrement on every answer"
 * bug.
 *
 * Background: a sibling-effect race in the consumer caused selectedFile /
 * selectedRank to remain set across the question advance. An auto-submit
 * `useEffect` in the BoardSymmetryChallenge component then fired a phantom
 * answer (stale file/rank against the new question) immediately after each
 * legitimate answer, decrementing hearts a second time.
 *
 * The fix: `useTimedSession` now exposes an `onAdvance` callback fired from
 * the same setTimeout body that flips `showFeedback` to false and commits the
 * next question. `useBoardSymmetrySession` uses it to reset selection state
 * inside that callback so React 18+ auto-batches the reset and the new
 * question into a single render commit. That removes the one-render gap
 * where a stale (file, rank, !showFeedback) triple coexists with a fresh
 * question.
 *
 * The hook tests below drive `useBoardSymmetrySession` through complete
 * answer cycles using fake timers and assert on heart counts and selection
 * state at each transition. A direct `useTimedSession` test also pins down
 * the new `onAdvance` API surface.
 */

// Advance through each countdown tick as separate act() steps so React
// flushes state between ticks (3 -> 2, 2 -> 1, 1 -> 0, 0 -> null).
function advancePastCountdown() {
  act(() => vi.advanceTimersByTime(1000));
  act(() => vi.advanceTimersByTime(1000));
  act(() => vi.advanceTimersByTime(1000));
  act(() => vi.advanceTimersByTime(500));
}

/**
 * Run one full feedback cycle to completion: advance past whichever flash
 * duration matches the answer correctness, then add one extra tick so any
 * trailing microtask / timer can settle.
 */
function advancePastFeedback(correct: boolean) {
  const duration = correct
    ? FEEDBACK_FLASH_MS.correct
    : FEEDBACK_FLASH_MS.incorrect;
  act(() => {
    vi.advanceTimersByTime(duration);
  });
  act(() => {
    vi.advanceTimersByTime(1);
  });
}

/**
 * Submit the correct answer for the hook's CURRENT problem, then advance
 * past the feedback timeout so the next question is committed.
 */
function answerCorrectly(result: {
  current: ReturnType<typeof useBoardSymmetrySession>;
}) {
  const problem = result.current.currentProblem;
  if (!problem) throw new Error("Expected a current problem to be present");
  const correct = calculateSymmetricSquare(problem.square, problem.type);
  act(() => {
    result.current.handleAnswer(correct[0], correct[1]);
  });
  advancePastFeedback(true);
}

/**
 * Submit a wrong answer for the hook's CURRENT problem, then advance past
 * the (longer) incorrect feedback timeout.
 */
function answerIncorrectly(result: {
  current: ReturnType<typeof useBoardSymmetrySession>;
}) {
  const problem = result.current.currentProblem;
  if (!problem) throw new Error("Expected a current problem to be present");
  const correct = calculateSymmetricSquare(problem.square, problem.type);
  // Pick any square that is not the correct one.
  const wrongFile = correct[0] === "a" ? "b" : "a";
  const wrongRank = correct[1] === "1" ? "2" : "1";
  act(() => {
    result.current.handleAnswer(wrongFile, wrongRank);
  });
  advancePastFeedback(false);
}

describe("useBoardSymmetrySession - hearts/feedback regression", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // ---------------------------------------------------------------------------
  // Bug-specific regressions
  // ---------------------------------------------------------------------------

  it("(1) correct answer does NOT decrement hearts", () => {
    const { result } = renderHook(() =>
      useBoardSymmetrySession({ timeLimit: 60, mistakeAllowance: 3 }),
    );

    advancePastCountdown();
    expect(result.current.currentProblem).not.toBeNull();

    answerCorrectly(result);

    expect(result.current.correctCount).toBe(1);
    expect(result.current.incorrectCount).toBe(0);
    // After advance, selection state must be reset for the new question.
    expect(result.current.selectedFile).toBeNull();
    expect(result.current.selectedRank).toBeNull();
    expect(result.current.correctSolution).toBeNull();
    expect(result.current.showFeedback).toBe(false);
    expect(result.current.isFinished).toBe(false);
  });

  it("(2) incorrect answer decrements hearts by exactly 1, not 2", () => {
    const { result } = renderHook(() =>
      useBoardSymmetrySession({ timeLimit: 60, mistakeAllowance: 3 }),
    );

    advancePastCountdown();
    answerIncorrectly(result);

    expect(result.current.incorrectCount).toBe(1);
    expect(result.current.correctCount).toBe(0);
    expect(result.current.selectedFile).toBeNull();
    expect(result.current.selectedRank).toBeNull();
    expect(result.current.showFeedback).toBe(false);
    expect(result.current.isFinished).toBe(false);
  });

  it("(3) two consecutive correct answers do not decrement hearts", () => {
    const { result } = renderHook(() =>
      useBoardSymmetrySession({ timeLimit: 60, mistakeAllowance: 3 }),
    );

    advancePastCountdown();
    answerCorrectly(result);
    answerCorrectly(result);

    expect(result.current.correctCount).toBe(2);
    expect(result.current.incorrectCount).toBe(0);
    expect(result.current.isFinished).toBe(false);
  });

  it("(4) correct then incorrect leaves correctCount=1, incorrectCount=1", () => {
    const { result } = renderHook(() =>
      useBoardSymmetrySession({ timeLimit: 60, mistakeAllowance: 3 }),
    );

    advancePastCountdown();
    answerCorrectly(result);
    answerIncorrectly(result);

    expect(result.current.correctCount).toBe(1);
    expect(result.current.incorrectCount).toBe(1);
    expect(result.current.isFinished).toBe(false);
  });

  it("(5) last-life finish: 3 wrong answers with mistakeAllowance=3 stops at exactly 3", () => {
    const { result } = renderHook(() =>
      useBoardSymmetrySession({ timeLimit: 60, mistakeAllowance: 3 }),
    );

    advancePastCountdown();
    answerIncorrectly(result);
    expect(result.current.incorrectCount).toBe(1);
    expect(result.current.isFinished).toBe(false);

    answerIncorrectly(result);
    expect(result.current.incorrectCount).toBe(2);
    expect(result.current.isFinished).toBe(false);

    // Third wrong answer triggers the terminal branch in useTimedSession
    // (mistakeAllowance reached). That branch does NOT call onAdvance, so the
    // hook should NOT generate another problem. We still advance the
    // incorrect-feedback timer so the terminal setTimeout fires.
    answerIncorrectly(result);

    expect(result.current.incorrectCount).toBe(3);
    expect(result.current.correctCount).toBe(0);
    expect(result.current.isFinished).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Extra: selection reset and showFeedback timing during the cycle
  // ---------------------------------------------------------------------------

  it("keeps selection visible during feedback, clears it on advance", () => {
    const { result } = renderHook(() =>
      useBoardSymmetrySession({ timeLimit: 60, mistakeAllowance: 3 }),
    );

    advancePastCountdown();
    const problem = result.current.currentProblem as BoardSymmetryProblem;
    const correct = calculateSymmetricSquare(problem.square, problem.type);

    act(() => {
      result.current.handleAnswer(correct[0], correct[1]);
    });

    // Mid-feedback: showFeedback should be true and correctSolution exposed.
    expect(result.current.showFeedback).toBe(true);
    expect(result.current.correctSolution).toBe(correct);

    // After the feedback timeout fires, selection + correctSolution reset
    // in the same render commit as the new question.
    advancePastFeedback(true);
    expect(result.current.showFeedback).toBe(false);
    expect(result.current.selectedFile).toBeNull();
    expect(result.current.selectedRank).toBeNull();
    expect(result.current.correctSolution).toBeNull();
  });
});

// =============================================================================
// useTimedSession - onAdvance API surface
// =============================================================================

describe("useTimedSession - onAdvance callback", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  // Same countdown-advance helper, scoped per file for clarity.
  function advancePastCountdownLocal() {
    act(() => vi.advanceTimersByTime(1000));
    act(() => vi.advanceTimersByTime(1000));
    act(() => vi.advanceTimersByTime(1000));
    act(() => vi.advanceTimersByTime(500));
  }

  it("(6) onAdvance is invoked exactly once per real answer cycle", () => {
    const onAdvance = vi.fn();
    const generateQuestion = vi.fn(() => "question");

    const { result } = renderHook(() =>
      useTimedSession({
        timeLimit: 60,
        generateQuestion,
        feedbackDuration: 100,
        onAdvance,
      }),
    );

    advancePastCountdownLocal();

    // Single full cycle: handleAnswer -> setTimeout body -> onAdvance fires
    // BEFORE showFeedback flips back to false.
    act(() => {
      result.current.handleAnswer(true);
    });
    expect(onAdvance).toHaveBeenCalledTimes(0);
    expect(result.current.showFeedback).toBe(true);

    act(() => {
      vi.advanceTimersByTime(100);
    });

    expect(onAdvance).toHaveBeenCalledTimes(1);
    expect(onAdvance).toHaveBeenCalledWith(true);
    expect(result.current.showFeedback).toBe(false);
  });

  it("onAdvance fires for both correct and incorrect answers", () => {
    const onAdvance = vi.fn();
    const generateQuestion = vi.fn(() => "question");

    const { result } = renderHook(() =>
      useTimedSession({
        timeLimit: 60,
        generateQuestion,
        feedbackDuration: 50,
        onAdvance,
      }),
    );

    advancePastCountdownLocal();

    act(() => {
      result.current.handleAnswer(true);
    });
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(onAdvance).toHaveBeenCalledTimes(1);
    expect(onAdvance).toHaveBeenNthCalledWith(1, true);

    act(() => {
      result.current.handleAnswer(false);
    });
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(onAdvance).toHaveBeenCalledTimes(2);
    expect(onAdvance).toHaveBeenNthCalledWith(2, false);
  });

  it("onAdvance does NOT fire when mistakeAllowance is reached on the same answer", () => {
    const onAdvance = vi.fn();
    const generateQuestion = vi.fn(() => "question");

    const { result } = renderHook(() =>
      useTimedSession({
        timeLimit: 60,
        generateQuestion,
        feedbackDuration: 50,
        mistakeAllowance: 1,
        onAdvance,
      }),
    );

    advancePastCountdownLocal();

    act(() => {
      result.current.handleAnswer(false);
    });
    act(() => {
      vi.advanceTimersByTime(50);
    });

    expect(result.current.isFinished).toBe(true);
    // The terminal-branch setTimeout intentionally skips onAdvance; a session
    // that just ended has no consumer state to reset.
    expect(onAdvance).toHaveBeenCalledTimes(0);
  });

  it("(7) consumers without onAdvance still complete a full answer cycle", () => {
    // Smoke test: no onAdvance, no errors thrown, state transitions normally.
    const generateQuestion = vi.fn(() => "question");

    const { result } = renderHook(() =>
      useTimedSession({
        timeLimit: 60,
        generateQuestion,
        feedbackDuration: 50,
      }),
    );

    advancePastCountdownLocal();

    expect(() => {
      act(() => {
        result.current.handleAnswer(true);
      });
      act(() => {
        vi.advanceTimersByTime(50);
      });
    }).not.toThrow();

    expect(result.current.correctCount).toBe(1);
    expect(result.current.incorrectCount).toBe(0);
    expect(result.current.showFeedback).toBe(false);
    expect(result.current.isFinished).toBe(false);
  });

  it("onAdvance throwing does NOT strand the session in feedback state", () => {
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    let counter = 0;
    const generateQuestion = vi.fn(() => `question-${++counter}`);
    const onAdvance = vi.fn(() => {
      throw new Error("consumer fault");
    });

    const { result } = renderHook(() =>
      useTimedSession({
        timeLimit: 60,
        generateQuestion,
        feedbackDuration: 50,
        onAdvance,
      }),
    );

    advancePastCountdownLocal();
    const firstQuestion = result.current.currentQuestion;
    expect(firstQuestion).toBe("question-1");

    act(() => {
      result.current.handleAnswer(true);
    });
    act(() => {
      vi.advanceTimersByTime(50);
    });

    // onAdvance threw, but the rest of the timeout body must still have run:
    // showFeedback cleared, lastAnswerCorrect reset, next question committed.
    expect(onAdvance).toHaveBeenCalledTimes(1);
    expect(result.current.showFeedback).toBe(false);
    expect(result.current.lastAnswerCorrect).toBeNull();
    expect(result.current.currentQuestion).toBe("question-2");
    expect(result.current.isFinished).toBe(false);

    // The thrown error was logged with the documented prefix.
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "useTimedSession: onAdvance threw, continuing advance:",
      expect.any(Error),
    );

    consoleErrorSpy.mockRestore();
  });
});
