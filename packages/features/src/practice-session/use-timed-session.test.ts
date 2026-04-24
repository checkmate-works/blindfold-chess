// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { useTimedSession } from "./use-timed-session";

// Advance through each countdown tick as separate act() steps so React
// flushes state between ticks (3→2, 2→1, 1→0, 0→null).
function advancePastCountdown() {
  act(() => vi.advanceTimersByTime(1000)); // 3 → 2
  act(() => vi.advanceTimersByTime(1000)); // 2 → 1
  act(() => vi.advanceTimersByTime(1000)); // 1 → 0
  act(() => vi.advanceTimersByTime(500)); //  0 → null
}

describe("useTimedSession", () => {
  const generateQuestion = vi.fn(() => "question");

  beforeEach(() => {
    vi.useFakeTimers();
    generateQuestion.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe("without mistakeAllowance (backward compatibility)", () => {
    it("does not finish on incorrect answers when mistakeAllowance is not set", () => {
      const { result } = renderHook(() =>
        useTimedSession({
          timeLimit: 60,
          generateQuestion,
          feedbackDuration: 0,
        }),
      );

      advancePastCountdown();

      for (let i = 0; i < 10; i++) {
        act(() => {
          result.current.handleAnswer(false);
        });
        act(() => {
          vi.advanceTimersByTime(10);
        });
      }

      expect(result.current.isFinished).toBe(false);
      expect(result.current.incorrectCount).toBe(10);
    });

    it("finishes when time limit is reached", () => {
      const { result } = renderHook(() =>
        useTimedSession({
          timeLimit: 60,
          generateQuestion,
          feedbackDuration: 0,
        }),
      );

      advancePastCountdown();

      expect(result.current.isFinished).toBe(false);

      act(() => {
        vi.advanceTimersByTime(60 * 1000);
      });

      expect(result.current.isFinished).toBe(true);
    });
  });

  describe("with mistakeAllowance=3", () => {
    it("does not finish when incorrect count is below mistakeAllowance", () => {
      const { result } = renderHook(() =>
        useTimedSession({
          timeLimit: 60,
          generateQuestion,
          feedbackDuration: 0,
          mistakeAllowance: 3,
        }),
      );

      advancePastCountdown();

      act(() => {
        result.current.handleAnswer(false);
      });
      act(() => {
        vi.advanceTimersByTime(10);
      });

      act(() => {
        result.current.handleAnswer(false);
      });
      act(() => {
        vi.advanceTimersByTime(10);
      });

      expect(result.current.incorrectCount).toBe(2);
      expect(result.current.isFinished).toBe(false);
    });

    it("finishes when incorrect count reaches mistakeAllowance", () => {
      const { result } = renderHook(() =>
        useTimedSession({
          timeLimit: 60,
          generateQuestion,
          feedbackDuration: 0,
          mistakeAllowance: 3,
        }),
      );

      advancePastCountdown();

      for (let i = 0; i < 3; i++) {
        act(() => {
          result.current.handleAnswer(false);
        });
        act(() => {
          vi.advanceTimersByTime(10);
        });
      }

      expect(result.current.incorrectCount).toBe(3);
      expect(result.current.isFinished).toBe(true);
    });

    it("does not finish with correct answers only", () => {
      const { result } = renderHook(() =>
        useTimedSession({
          timeLimit: 60,
          generateQuestion,
          feedbackDuration: 0,
          mistakeAllowance: 3,
        }),
      );

      advancePastCountdown();

      for (let i = 0; i < 20; i++) {
        act(() => {
          result.current.handleAnswer(true);
        });
        act(() => {
          vi.advanceTimersByTime(10);
        });
      }

      expect(result.current.correctCount).toBe(20);
      expect(result.current.incorrectCount).toBe(0);
      expect(result.current.isFinished).toBe(false);
    });

    it("correctly counts mixed answers before reaching mistakeAllowance", () => {
      const { result } = renderHook(() =>
        useTimedSession({
          timeLimit: 60,
          generateQuestion,
          feedbackDuration: 0,
          mistakeAllowance: 3,
        }),
      );

      advancePastCountdown();

      const answers = [true, false, true, false];
      for (const correct of answers) {
        act(() => {
          result.current.handleAnswer(correct);
        });
        act(() => {
          vi.advanceTimersByTime(10);
        });
      }

      expect(result.current.isFinished).toBe(false);
      expect(result.current.incorrectCount).toBe(2);
      expect(result.current.correctCount).toBe(2);

      act(() => {
        result.current.handleAnswer(true);
      });
      act(() => {
        vi.advanceTimersByTime(10);
      });

      act(() => {
        result.current.handleAnswer(false);
      });
      act(() => {
        vi.advanceTimersByTime(10);
      });

      expect(result.current.incorrectCount).toBe(3);
      expect(result.current.correctCount).toBe(3);
      expect(result.current.isFinished).toBe(true);
    });

    it("ignores further answers after reaching mistakeAllowance", () => {
      const { result } = renderHook(() =>
        useTimedSession({
          timeLimit: 60,
          generateQuestion,
          feedbackDuration: 0,
          mistakeAllowance: 3,
        }),
      );

      advancePastCountdown();

      for (let i = 0; i < 3; i++) {
        act(() => {
          result.current.handleAnswer(false);
        });
        act(() => {
          vi.advanceTimersByTime(10);
        });
      }

      expect(result.current.isFinished).toBe(true);

      act(() => {
        result.current.handleAnswer(true);
      });
      act(() => {
        vi.advanceTimersByTime(10);
      });

      expect(result.current.correctCount).toBe(0);
      expect(result.current.incorrectCount).toBe(3);
    });
  });

  describe("with mistakeAllowance=1 (boundary value)", () => {
    it("finishes immediately on first incorrect answer", () => {
      const { result } = renderHook(() =>
        useTimedSession({
          timeLimit: 60,
          generateQuestion,
          feedbackDuration: 0,
          mistakeAllowance: 1,
        }),
      );

      advancePastCountdown();

      act(() => {
        result.current.handleAnswer(false);
      });
      act(() => {
        vi.advanceTimersByTime(10);
      });

      expect(result.current.incorrectCount).toBe(1);
      expect(result.current.isFinished).toBe(true);
    });

    it("does not finish on correct answer with mistakeAllowance=1", () => {
      const { result } = renderHook(() =>
        useTimedSession({
          timeLimit: 60,
          generateQuestion,
          feedbackDuration: 0,
          mistakeAllowance: 1,
        }),
      );

      advancePastCountdown();

      act(() => {
        result.current.handleAnswer(true);
      });
      act(() => {
        vi.advanceTimersByTime(10);
      });

      expect(result.current.correctCount).toBe(1);
      expect(result.current.incorrectCount).toBe(0);
      expect(result.current.isFinished).toBe(false);
    });
  });

  describe("totalCount tracking", () => {
    it("totalCount equals correctCount + incorrectCount", () => {
      const { result } = renderHook(() =>
        useTimedSession({
          timeLimit: 60,
          generateQuestion,
          feedbackDuration: 0,
        }),
      );

      advancePastCountdown();

      act(() => {
        result.current.handleAnswer(true);
      });
      act(() => {
        vi.advanceTimersByTime(10);
      });

      act(() => {
        result.current.handleAnswer(false);
      });
      act(() => {
        vi.advanceTimersByTime(10);
      });

      act(() => {
        result.current.handleAnswer(true);
      });
      act(() => {
        vi.advanceTimersByTime(10);
      });

      expect(result.current.correctCount).toBe(2);
      expect(result.current.incorrectCount).toBe(1);
      expect(result.current.totalCount).toBe(3);
    });
  });

  describe("handleAnswer guards", () => {
    it("ignores answer when already finished via time limit", () => {
      const { result } = renderHook(() =>
        useTimedSession({
          timeLimit: 60,
          generateQuestion,
          feedbackDuration: 0,
        }),
      );

      advancePastCountdown();

      act(() => {
        vi.advanceTimersByTime(60 * 1000);
      });

      expect(result.current.isFinished).toBe(true);

      act(() => {
        result.current.handleAnswer(true);
      });

      expect(result.current.correctCount).toBe(0);
      expect(result.current.totalCount).toBe(0);
    });
  });

  describe("onAnswerEffect", () => {
    it("calls onAnswerEffect with correct=true on correct answer", () => {
      const onAnswerEffect = vi.fn();
      const { result } = renderHook(() =>
        useTimedSession({
          timeLimit: 60,
          generateQuestion,
          feedbackDuration: 0,
          onAnswerEffect,
        }),
      );

      advancePastCountdown();

      act(() => {
        result.current.handleAnswer(true);
      });

      expect(onAnswerEffect).toHaveBeenCalledWith(true);
    });

    it("calls onAnswerEffect with correct=false on incorrect answer", () => {
      const onAnswerEffect = vi.fn();
      const { result } = renderHook(() =>
        useTimedSession({
          timeLimit: 60,
          generateQuestion,
          feedbackDuration: 0,
          onAnswerEffect,
        }),
      );

      advancePastCountdown();

      act(() => {
        result.current.handleAnswer(false);
      });

      expect(onAnswerEffect).toHaveBeenCalledWith(false);
    });

    it("does not throw when onAnswerEffect is not provided", () => {
      const { result } = renderHook(() =>
        useTimedSession({
          timeLimit: 60,
          generateQuestion,
          feedbackDuration: 0,
        }),
      );

      advancePastCountdown();

      expect(() => {
        act(() => {
          result.current.handleAnswer(true);
        });
      }).not.toThrow();
    });
  });
});
