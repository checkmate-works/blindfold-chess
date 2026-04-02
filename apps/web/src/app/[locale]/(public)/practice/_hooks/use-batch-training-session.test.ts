import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useBatchTrainingSession } from './use-batch-training-session';

// Mock use-scroll-to-element to avoid DOM side effects
vi.mock('@/app/[locale]/(public)/practice/_hooks/use-scroll-to-element', () => ({
  useScrollToElement: () => {},
}));

describe('useBatchTrainingSession', () => {
  const FEEDBACK_DELAY = 500;

  // Generate deterministic questions: ['q0', 'q1', 'q2', ...]
  const generateBatch = vi.fn((size: number) => Array.from({ length: size }, (_, i) => `q${i}`));

  // Simple checkAnswer: answerData === 'correct' means correct
  const checkAnswer = vi.fn((_question: string, answerData: string) => answerData === 'correct');

  beforeEach(() => {
    vi.useFakeTimers();
    generateBatch.mockClear();
    checkAnswer.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function renderSession(overrides = {}) {
    return renderHook(() =>
      useBatchTrainingSession<string, string>({
        batchSize: 10,
        generateBatch,
        checkAnswer,
        feedbackDelayMs: FEEDBACK_DELAY,
        ...overrides,
      })
    );
  }

  // ===========================================================================
  // handleAnswer sets skipped to false
  // ===========================================================================
  describe('handleAnswer sets skipped to false', () => {
    it('sets skipped to false on correct answer', () => {
      const { result } = renderSession();

      act(() => {
        result.current.handleAnswer('correct');
      });

      expect(result.current.lastAnswer).not.toBeNull();
      expect(result.current.lastAnswer!.skipped).toBe(false);
      expect(result.current.lastAnswer!.correct).toBe(true);
      expect(result.current.lastAnswer!.userAnswerData).toBe('correct');
    });

    it('sets skipped to false on incorrect answer', () => {
      const { result } = renderSession();

      act(() => {
        result.current.handleAnswer('wrong');
      });

      expect(result.current.lastAnswer).not.toBeNull();
      expect(result.current.lastAnswer!.skipped).toBe(false);
      expect(result.current.lastAnswer!.correct).toBe(false);
      expect(result.current.lastAnswer!.userAnswerData).toBe('wrong');
    });
  });

  // ===========================================================================
  // handleSkip basic behavior
  // ===========================================================================
  describe('handleSkip basic behavior', () => {
    it('sets showResult to true', () => {
      const { result } = renderSession();

      expect(result.current.showResult).toBe(false);

      act(() => {
        result.current.handleSkip();
      });

      expect(result.current.showResult).toBe(true);
    });

    it('sets lastAnswer.skipped to true', () => {
      const { result } = renderSession();

      act(() => {
        result.current.handleSkip();
      });

      expect(result.current.lastAnswer).not.toBeNull();
      expect(result.current.lastAnswer!.skipped).toBe(true);
    });

    it('sets lastAnswer.correct to false', () => {
      const { result } = renderSession();

      act(() => {
        result.current.handleSkip();
      });

      expect(result.current.lastAnswer!.correct).toBe(false);
    });

    it('sets lastAnswer.userAnswerData to null', () => {
      const { result } = renderSession();

      act(() => {
        result.current.handleSkip();
      });

      expect(result.current.lastAnswer!.userAnswerData).toBeNull();
    });

    it('sets lastAnswer.question to the current question', () => {
      const { result } = renderSession();

      const questionBeforeSkip = result.current.currentQuestion;

      act(() => {
        result.current.handleSkip();
      });

      expect(result.current.lastAnswer!.question).toBe(questionBeforeSkip);
    });
  });

  // ===========================================================================
  // handleSkip increments incorrect count
  // ===========================================================================
  describe('handleSkip increments incorrect count', () => {
    it('increases incorrectCount by 1 after a skip', () => {
      const { result } = renderSession();

      expect(result.current.incorrectCount).toBe(0);

      act(() => {
        result.current.handleSkip();
      });

      expect(result.current.incorrectCount).toBe(1);
    });

    it('does not increment correctCount after a skip', () => {
      const { result } = renderSession();

      act(() => {
        result.current.handleSkip();
      });

      expect(result.current.correctCount).toBe(0);
    });

    it('accumulates incorrect count across multiple skips', () => {
      const { result } = renderSession();

      // Skip 3 times, advancing past feedback each time
      for (let i = 0; i < 3; i++) {
        act(() => {
          result.current.handleSkip();
        });
        act(() => {
          vi.advanceTimersByTime(FEEDBACK_DELAY);
        });
      }

      expect(result.current.incorrectCount).toBe(3);
      expect(result.current.correctCount).toBe(0);
    });

    it('correctly counts mixed answers and skips', () => {
      const { result } = renderSession();

      // Correct answer
      act(() => {
        result.current.handleAnswer('correct');
      });
      act(() => {
        vi.advanceTimersByTime(FEEDBACK_DELAY);
      });

      // Skip
      act(() => {
        result.current.handleSkip();
      });
      act(() => {
        vi.advanceTimersByTime(FEEDBACK_DELAY);
      });

      // Incorrect answer
      act(() => {
        result.current.handleAnswer('wrong');
      });
      act(() => {
        vi.advanceTimersByTime(FEEDBACK_DELAY);
      });

      // Skip again
      act(() => {
        result.current.handleSkip();
      });
      act(() => {
        vi.advanceTimersByTime(FEEDBACK_DELAY);
      });

      expect(result.current.correctCount).toBe(1);
      expect(result.current.incorrectCount).toBe(3); // 1 wrong + 2 skips
    });
  });

  // ===========================================================================
  // handleSkip advances to next question
  // ===========================================================================
  describe('handleSkip advances to next question', () => {
    it('moves to the next question after feedback delay', () => {
      const { result } = renderSession();

      const firstQuestion = result.current.currentQuestion;

      act(() => {
        result.current.handleSkip();
      });

      // Still showing the same question during feedback
      expect(result.current.showResult).toBe(true);

      // Advance past feedback delay
      act(() => {
        vi.advanceTimersByTime(FEEDBACK_DELAY);
      });

      expect(result.current.showResult).toBe(false);
      expect(result.current.lastAnswer).toBeNull();
      expect(result.current.currentQuestion).not.toBe(firstQuestion);
    });

    it('does not advance before feedback delay completes', () => {
      const { result } = renderSession();

      const firstQuestion = result.current.currentQuestion;

      act(() => {
        result.current.handleSkip();
      });

      // Advance only partially
      act(() => {
        vi.advanceTimersByTime(FEEDBACK_DELAY - 1);
      });

      // Should still be showing result
      expect(result.current.showResult).toBe(true);
      expect(result.current.currentQuestion).toBe(firstQuestion);
    });

    it('uses function-based feedbackDelayMs correctly for skip', () => {
      const customDelay = vi.fn((_isCorrect: boolean) => 1000);
      const { result } = renderSession({ feedbackDelayMs: customDelay });

      act(() => {
        result.current.handleSkip();
      });

      // The function should be called with false (skip is always incorrect)
      expect(customDelay).toHaveBeenCalledWith(false);

      // Should not advance at 999ms
      act(() => {
        vi.advanceTimersByTime(999);
      });
      expect(result.current.showResult).toBe(true);

      // Should advance at 1000ms
      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(result.current.showResult).toBe(false);
    });
  });

  // ===========================================================================
  // handleSkip is blocked during showResult
  // ===========================================================================
  describe('handleSkip is blocked during showResult', () => {
    it('ignores handleSkip while already showing result from a previous skip', () => {
      const { result } = renderSession();

      // First skip
      act(() => {
        result.current.handleSkip();
      });

      expect(result.current.incorrectCount).toBe(1);
      expect(result.current.showResult).toBe(true);

      // Second skip while still showing result - should be no-op
      act(() => {
        result.current.handleSkip();
      });

      expect(result.current.incorrectCount).toBe(1); // unchanged

      // Advance past feedback
      act(() => {
        vi.advanceTimersByTime(FEEDBACK_DELAY);
      });

      expect(result.current.showResult).toBe(false);
      expect(result.current.incorrectCount).toBe(1); // still 1
    });

    it('ignores handleSkip while showing result from a normal answer', () => {
      const { result } = renderSession();

      // Normal answer
      act(() => {
        result.current.handleAnswer('correct');
      });

      expect(result.current.showResult).toBe(true);

      // Try to skip during feedback - should be no-op
      act(() => {
        result.current.handleSkip();
      });

      expect(result.current.correctCount).toBe(1);
      expect(result.current.incorrectCount).toBe(0); // skip was ignored
    });

    it('handleAnswer is also blocked while showing result from a skip', () => {
      const { result } = renderSession();

      // Skip
      act(() => {
        result.current.handleSkip();
      });

      expect(result.current.showResult).toBe(true);

      // Try to answer during skip feedback - should be no-op
      act(() => {
        result.current.handleAnswer('correct');
      });

      expect(result.current.incorrectCount).toBe(1);
      expect(result.current.correctCount).toBe(0); // answer was ignored
    });
  });

  // ===========================================================================
  // onFeedbackStart callback
  // ===========================================================================
  describe('handleSkip onFeedbackStart callback', () => {
    it('calls onFeedbackStart with false when skip is invoked', () => {
      const { result } = renderSession();
      const onFeedbackStart = vi.fn();

      act(() => {
        result.current.handleSkip(onFeedbackStart);
      });

      expect(onFeedbackStart).toHaveBeenCalledOnce();
      expect(onFeedbackStart).toHaveBeenCalledWith(false);
    });

    it('does not call onFeedbackStart when skip is blocked', () => {
      const { result } = renderSession();
      const onFeedbackStart = vi.fn();

      // First skip to enter showResult state
      act(() => {
        result.current.handleSkip();
      });

      // Second skip (blocked) with callback
      act(() => {
        result.current.handleSkip(onFeedbackStart);
      });

      expect(onFeedbackStart).not.toHaveBeenCalled();
    });
  });
});
