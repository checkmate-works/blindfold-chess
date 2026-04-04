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
      const customDelay = vi.fn<(isCorrect: boolean) => number>().mockReturnValue(1000);
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

  // ===========================================================================
  // skipAutoAdvance: false behavior
  // ===========================================================================
  describe('skipAutoAdvance: false', () => {
    it('does not auto-advance after handleSkip when skipAutoAdvance is false', () => {
      const { result } = renderSession({ skipAutoAdvance: false });

      const firstQuestion = result.current.currentQuestion;

      act(() => {
        result.current.handleSkip();
      });

      expect(result.current.showResult).toBe(true);

      // Advance well past the feedback delay
      act(() => {
        vi.advanceTimersByTime(FEEDBACK_DELAY * 10);
      });

      // Should still be showing result — no auto-advance
      expect(result.current.showResult).toBe(true);
      expect(result.current.currentQuestion).toBe(firstQuestion);
    });

    it('handleNextAfterSkip advances to next question and clears showResult', () => {
      const { result } = renderSession({ skipAutoAdvance: false });

      const firstQuestion = result.current.currentQuestion;

      act(() => {
        result.current.handleSkip();
      });

      expect(result.current.showResult).toBe(true);

      act(() => {
        result.current.handleNextAfterSkip();
      });

      expect(result.current.showResult).toBe(false);
      expect(result.current.lastAnswer).toBeNull();
      expect(result.current.currentQuestion).not.toBe(firstQuestion);
    });
  });

  // ===========================================================================
  // skipAutoAdvance: true (default) — handleNextAfterSkip is no-op
  // ===========================================================================
  describe('skipAutoAdvance: true (default)', () => {
    it('handleNextAfterSkip is a no-op when skipAutoAdvance is true', () => {
      const { result } = renderSession(); // default skipAutoAdvance: true

      act(() => {
        result.current.handleSkip();
      });

      expect(result.current.showResult).toBe(true);
      const questionDuringSkip = result.current.currentQuestion;

      // Call handleNextAfterSkip — should be no-op
      act(() => {
        result.current.handleNextAfterSkip();
      });

      // State should remain unchanged
      expect(result.current.showResult).toBe(true);
      expect(result.current.currentQuestion).toBe(questionDuringSkip);
    });
  });

  // ===========================================================================
  // incorrectAutoAdvance: false behavior
  // ===========================================================================
  describe('incorrectAutoAdvance: false', () => {
    it('does not auto-advance after an incorrect answer', () => {
      const { result } = renderSession({ incorrectAutoAdvance: false });

      const firstQuestion = result.current.currentQuestion;

      act(() => {
        result.current.handleAnswer('wrong');
      });

      expect(result.current.showResult).toBe(true);

      // Advance well past the feedback delay — should NOT auto-advance
      act(() => {
        vi.advanceTimersByTime(FEEDBACK_DELAY * 10);
      });

      expect(result.current.showResult).toBe(true);
      expect(result.current.currentQuestion).toBe(firstQuestion);
    });

    it('still auto-advances after a correct answer', () => {
      const { result } = renderSession({ incorrectAutoAdvance: false });

      const firstQuestion = result.current.currentQuestion;

      act(() => {
        result.current.handleAnswer('correct');
      });

      expect(result.current.showResult).toBe(true);

      // Advance past the feedback delay — correct answers should still auto-advance
      act(() => {
        vi.advanceTimersByTime(FEEDBACK_DELAY);
      });

      expect(result.current.showResult).toBe(false);
      expect(result.current.lastAnswer).toBeNull();
      expect(result.current.currentQuestion).not.toBe(firstQuestion);
    });

    it('handleNextAfterIncorrect advances to next question and clears showResult', () => {
      const { result } = renderSession({ incorrectAutoAdvance: false });

      const firstQuestion = result.current.currentQuestion;

      act(() => {
        result.current.handleAnswer('wrong');
      });

      expect(result.current.showResult).toBe(true);

      act(() => {
        result.current.handleNextAfterIncorrect();
      });

      expect(result.current.showResult).toBe(false);
      expect(result.current.lastAnswer).toBeNull();
      expect(result.current.currentQuestion).not.toBe(firstQuestion);
    });

    it('handleNextAfterIncorrect clears incorrectCount tracking correctly', () => {
      const { result } = renderSession({ incorrectAutoAdvance: false });

      // First incorrect answer
      act(() => {
        result.current.handleAnswer('wrong');
      });

      expect(result.current.incorrectCount).toBe(1);

      act(() => {
        result.current.handleNextAfterIncorrect();
      });

      // Second incorrect answer
      act(() => {
        result.current.handleAnswer('wrong');
      });

      expect(result.current.incorrectCount).toBe(2);

      act(() => {
        result.current.handleNextAfterIncorrect();
      });

      // Correct answer
      act(() => {
        result.current.handleAnswer('correct');
      });

      expect(result.current.correctCount).toBe(1);
      expect(result.current.incorrectCount).toBe(2);
    });

    it('uses function-based feedbackDelayMs only for correct answers', () => {
      const customDelay = vi.fn<(isCorrect: boolean) => number>((isCorrect) =>
        isCorrect ? 300 : 1000
      );
      const { result } = renderSession({
        incorrectAutoAdvance: false,
        feedbackDelayMs: customDelay,
      });

      // Incorrect answer — feedbackDelayMs should NOT be called since no auto-advance
      act(() => {
        result.current.handleAnswer('wrong');
      });

      // The function is not called for incorrect answers when incorrectAutoAdvance is false
      expect(customDelay).not.toHaveBeenCalled();

      // Manually advance
      act(() => {
        result.current.handleNextAfterIncorrect();
      });

      // Correct answer — feedbackDelayMs should be called
      act(() => {
        result.current.handleAnswer('correct');
      });

      expect(customDelay).toHaveBeenCalledWith(true);

      // Should auto-advance after 300ms (the correct delay)
      act(() => {
        vi.advanceTimersByTime(300);
      });

      expect(result.current.showResult).toBe(false);
    });
  });

  // ===========================================================================
  // incorrectAutoAdvance: true (default) — handleNextAfterIncorrect is no-op
  // ===========================================================================
  describe('incorrectAutoAdvance: true (default)', () => {
    it('handleNextAfterIncorrect is a no-op when incorrectAutoAdvance is true', () => {
      const { result } = renderSession(); // default incorrectAutoAdvance: true

      act(() => {
        result.current.handleAnswer('wrong');
      });

      expect(result.current.showResult).toBe(true);
      const questionDuringFeedback = result.current.currentQuestion;

      // Call handleNextAfterIncorrect — should be no-op
      act(() => {
        result.current.handleNextAfterIncorrect();
      });

      // State should remain unchanged
      expect(result.current.showResult).toBe(true);
      expect(result.current.currentQuestion).toBe(questionDuringFeedback);
    });

    it('auto-advances after incorrect answer with default settings', () => {
      const { result } = renderSession(); // default incorrectAutoAdvance: true

      const firstQuestion = result.current.currentQuestion;

      act(() => {
        result.current.handleAnswer('wrong');
      });

      act(() => {
        vi.advanceTimersByTime(FEEDBACK_DELAY);
      });

      expect(result.current.showResult).toBe(false);
      expect(result.current.lastAnswer).toBeNull();
      expect(result.current.currentQuestion).not.toBe(firstQuestion);
    });
  });

  // ===========================================================================
  // Combined: incorrectAutoAdvance: false and skipAutoAdvance: false
  // ===========================================================================
  describe('incorrectAutoAdvance: false with skipAutoAdvance: false', () => {
    it('neither skip nor incorrect answer auto-advances', () => {
      const { result } = renderSession({
        incorrectAutoAdvance: false,
        skipAutoAdvance: false,
      });

      const firstQuestion = result.current.currentQuestion;

      // Skip — should not auto-advance
      act(() => {
        result.current.handleSkip();
      });

      act(() => {
        vi.advanceTimersByTime(FEEDBACK_DELAY * 10);
      });

      expect(result.current.showResult).toBe(true);
      expect(result.current.currentQuestion).toBe(firstQuestion);

      // Manually advance after skip
      act(() => {
        result.current.handleNextAfterSkip();
      });

      const secondQuestion = result.current.currentQuestion;
      expect(secondQuestion).not.toBe(firstQuestion);

      // Incorrect answer — should not auto-advance
      act(() => {
        result.current.handleAnswer('wrong');
      });

      act(() => {
        vi.advanceTimersByTime(FEEDBACK_DELAY * 10);
      });

      expect(result.current.showResult).toBe(true);
      expect(result.current.currentQuestion).toBe(secondQuestion);

      // Manually advance after incorrect
      act(() => {
        result.current.handleNextAfterIncorrect();
      });

      expect(result.current.showResult).toBe(false);
      expect(result.current.currentQuestion).not.toBe(secondQuestion);
    });

    it('correct answer still auto-advances even when both flags are false', () => {
      const { result } = renderSession({
        incorrectAutoAdvance: false,
        skipAutoAdvance: false,
      });

      const firstQuestion = result.current.currentQuestion;

      act(() => {
        result.current.handleAnswer('correct');
      });

      act(() => {
        vi.advanceTimersByTime(FEEDBACK_DELAY);
      });

      expect(result.current.showResult).toBe(false);
      expect(result.current.currentQuestion).not.toBe(firstQuestion);
    });
  });
});
