'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useCountdown } from '@/app/[locale]/practice/_hooks/useCountdown';
import { useGameTimer } from '@/app/[locale]/practice/_hooks/useGameTimer';

export type UseTimedSessionConfig<TQuestion> = {
  timeLimit: number;
  generateQuestion: () => TQuestion;
  feedbackDuration?: number | ((correct: boolean) => number);
};

export type UseTimedSessionReturn<TQuestion> = {
  currentQuestion: TQuestion | null;
  isPlaying: boolean;
  isPaused: boolean;
  countdown: number | null;
  timeElapsed: number;
  timeRemaining: number;
  totalTime: number;
  correctCount: number;
  incorrectCount: number;
  totalCount: number;
  showFeedback: boolean;
  lastAnswerCorrect: boolean | null;
  isFinished: boolean;
  handleAnswer: (correct: boolean) => void;
  togglePause: () => void;
};

const DEFAULT_FEEDBACK_DURATION = 500;

export function useTimedSession<TQuestion>(
  config: UseTimedSessionConfig<TQuestion>
): UseTimedSessionReturn<TQuestion> {
  const { timeLimit, generateQuestion, feedbackDuration = DEFAULT_FEEDBACK_DURATION } = config;

  // Use refs to always access the latest callbacks inside setTimeout
  const generateQuestionRef = useRef(generateQuestion);
  generateQuestionRef.current = generateQuestion;

  const feedbackDurationRef = useRef(feedbackDuration);
  feedbackDurationRef.current = feedbackDuration;

  // Core state
  const [currentQuestion, setCurrentQuestion] = useState<TQuestion | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [showFeedback, setShowFeedback] = useState(false);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);
  const [isFinished, setIsFinished] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  const hasStarted = useRef(false);
  const isFinishedRef = useRef(false);
  const feedbackTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  // Countdown
  const { countdown } = useCountdown();

  // Auto-start on mount
  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    setCurrentQuestion(generateQuestionRef.current());
  }, []);

  // Timer
  const isPlaying =
    currentQuestion !== null && !isFinished && countdown === null && !showFeedback && !isPaused;

  const { timeElapsed, totalTime } = useGameTimer({
    timeLimit,
    isActive: isPlaying,
    onTimeLimitReached: useCallback(() => {
      isFinishedRef.current = true;
      setIsFinished(true);
    }, []),
  });

  // Cleanup feedback timeout on unmount
  useEffect(() => {
    return () => {
      if (feedbackTimeoutRef.current) clearTimeout(feedbackTimeoutRef.current);
    };
  }, []);

  const togglePause = useCallback(() => {
    if (isFinished || countdown !== null) return;
    setIsPaused((prev) => !prev);
  }, [isFinished, countdown]);

  const handleAnswer = useCallback(
    (correct: boolean) => {
      if (isFinished || countdown !== null || showFeedback || isPaused) return;

      setLastAnswerCorrect(correct);
      setShowFeedback(true);

      if (correct) {
        setCorrectCount((prev) => prev + 1);
      } else {
        setIncorrectCount((prev) => prev + 1);
      }

      const duration =
        typeof feedbackDurationRef.current === 'function'
          ? feedbackDurationRef.current(correct)
          : feedbackDurationRef.current;

      feedbackTimeoutRef.current = setTimeout(() => {
        if (isFinishedRef.current) return;
        setCurrentQuestion(generateQuestionRef.current());
        setShowFeedback(false);
        setLastAnswerCorrect(null);
      }, duration);
    },
    [isFinished, countdown, showFeedback, isPaused]
  );

  const timeRemaining = Math.max(0, timeLimit - timeElapsed);

  return {
    currentQuestion,
    isPlaying,
    isPaused,
    countdown,
    timeElapsed,
    timeRemaining,
    totalTime,
    correctCount,
    incorrectCount,
    totalCount: correctCount + incorrectCount,
    showFeedback,
    lastAnswerCorrect,
    isFinished,
    handleAnswer,
    togglePause,
  };
}
