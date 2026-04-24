import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useTimedSession } from './use-timed-session';

// Mock use-countdown to skip countdown phase
vi.mock('@/app/[locale]/(public)/practice/_hooks/use-countdown', () => ({
  useCountdown: () => ({ countdown: null, isCountingDown: false }),
}));

// Mock use-game-timer with controllable behavior
const mockOnTimeLimitReached = vi.fn();

vi.mock('@blindfold-chess/features/practice-session', () => ({
  useGameTimer: ({ onTimeLimitReached }: { onTimeLimitReached?: () => void }) => {
    // Store the callback so tests can invoke it
    mockOnTimeLimitReached.mockImplementation(() => onTimeLimitReached?.());
    return {
      timeElapsed: 0,
      totalTime: 0,
    };
  },
}));

describe('useTimedSession', () => {
  const generateQuestion = vi.fn(() => 'question');

  beforeEach(() => {
    vi.useFakeTimers();
    generateQuestion.mockClear();
    mockOnTimeLimitReached.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('without mistakeAllowance (backward compatibility)', () => {
    it('does not finish on incorrect answers when mistakeAllowance is not set', () => {
      const { result } = renderHook(() =>
        useTimedSession({
          timeLimit: 60,
          generateQuestion,
          feedbackDuration: 0,
        })
      );

      // Answer incorrectly multiple times
      for (let i = 0; i < 10; i++) {
        act(() => {
          result.current.handleAnswer(false);
        });
        // Advance past feedback duration
        act(() => {
          vi.advanceTimersByTime(10);
        });
      }

      expect(result.current.isFinished).toBe(false);
      expect(result.current.incorrectCount).toBe(10);
    });

    it('finishes only when time limit is reached', () => {
      const { result } = renderHook(() =>
        useTimedSession({
          timeLimit: 60,
          generateQuestion,
          feedbackDuration: 0,
        })
      );

      expect(result.current.isFinished).toBe(false);

      // Simulate time limit reached
      act(() => {
        mockOnTimeLimitReached();
      });

      expect(result.current.isFinished).toBe(true);
    });
  });

  describe('with mistakeAllowance=3', () => {
    it('does not finish when incorrect count is below mistakeAllowance', () => {
      const { result } = renderHook(() =>
        useTimedSession({
          timeLimit: 60,
          generateQuestion,
          feedbackDuration: 0,
          mistakeAllowance: 3,
        })
      );

      // 2 incorrect answers (below threshold)
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

    it('finishes when incorrect count reaches mistakeAllowance', () => {
      const { result } = renderHook(() =>
        useTimedSession({
          timeLimit: 60,
          generateQuestion,
          feedbackDuration: 0,
          mistakeAllowance: 3,
        })
      );

      // 3 incorrect answers
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

      act(() => {
        result.current.handleAnswer(false);
      });
      act(() => {
        vi.advanceTimersByTime(10);
      });

      expect(result.current.incorrectCount).toBe(3);
      expect(result.current.isFinished).toBe(true);
    });

    it('does not finish with correct answers only', () => {
      const { result } = renderHook(() =>
        useTimedSession({
          timeLimit: 60,
          generateQuestion,
          feedbackDuration: 0,
          mistakeAllowance: 3,
        })
      );

      // Many correct answers
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

    it('correctly counts mixed answers before reaching mistakeAllowance', () => {
      const { result } = renderHook(() =>
        useTimedSession({
          timeLimit: 60,
          generateQuestion,
          feedbackDuration: 0,
          mistakeAllowance: 3,
        })
      );

      // correct, incorrect, correct, incorrect, correct, incorrect -> finishes
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

      act(() => {
        result.current.handleAnswer(false);
      });
      act(() => {
        vi.advanceTimersByTime(10);
      });

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

    it('ignores further answers after reaching mistakeAllowance', () => {
      const { result } = renderHook(() =>
        useTimedSession({
          timeLimit: 60,
          generateQuestion,
          feedbackDuration: 0,
          mistakeAllowance: 3,
        })
      );

      // Reach mistakeAllowance
      for (let i = 0; i < 3; i++) {
        act(() => {
          result.current.handleAnswer(false);
        });
        act(() => {
          vi.advanceTimersByTime(10);
        });
      }

      expect(result.current.isFinished).toBe(true);

      // Try to answer again - should be ignored
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

  describe('with mistakeAllowance=1 (boundary value)', () => {
    it('finishes immediately on first incorrect answer', () => {
      const { result } = renderHook(() =>
        useTimedSession({
          timeLimit: 60,
          generateQuestion,
          feedbackDuration: 0,
          mistakeAllowance: 1,
        })
      );

      act(() => {
        result.current.handleAnswer(false);
      });
      act(() => {
        vi.advanceTimersByTime(10);
      });

      expect(result.current.incorrectCount).toBe(1);
      expect(result.current.isFinished).toBe(true);
    });

    it('does not finish on correct answer with mistakeAllowance=1', () => {
      const { result } = renderHook(() =>
        useTimedSession({
          timeLimit: 60,
          generateQuestion,
          feedbackDuration: 0,
          mistakeAllowance: 1,
        })
      );

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

  describe('totalCount tracking', () => {
    it('totalCount equals correctCount + incorrectCount', () => {
      const { result } = renderHook(() =>
        useTimedSession({
          timeLimit: 60,
          generateQuestion,
          feedbackDuration: 0,
        })
      );

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

  describe('handleAnswer guards', () => {
    it('ignores answer when already finished via time limit', () => {
      const { result } = renderHook(() =>
        useTimedSession({
          timeLimit: 60,
          generateQuestion,
          feedbackDuration: 0,
        })
      );

      // Finish via time limit
      act(() => {
        mockOnTimeLimitReached();
      });

      expect(result.current.isFinished).toBe(true);

      // Try to answer - should be ignored
      act(() => {
        result.current.handleAnswer(true);
      });

      expect(result.current.correctCount).toBe(0);
      expect(result.current.totalCount).toBe(0);
    });
  });
});
