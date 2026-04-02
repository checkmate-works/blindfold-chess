import { useCallback, useEffect, useRef, useState } from 'react';

import { useScrollToElement } from './use-scroll-to-element';

type UseBatchTrainingSessionConfig<TQuestion, TAnswerData> = {
  batchSize?: number;
  generateBatch: (size: number) => TQuestion[];
  checkAnswer: (question: TQuestion, answerParams: TAnswerData) => boolean;
  feedbackDelayMs?: number | ((isCorrect: boolean) => number);
  scrollTargetId?: string;
  skipAutoAdvance?: boolean;
};

export function useBatchTrainingSession<TQuestion, TAnswerData>({
  batchSize = 100,
  generateBatch,
  checkAnswer,
  feedbackDelayMs = 500,
  scrollTargetId,
  skipAutoAdvance = true,
}: UseBatchTrainingSessionConfig<TQuestion, TAnswerData>) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [questions, setQuestions] = useState<TQuestion[]>([]);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [lastAnswer, setLastAnswer] = useState<
    | {
        correct: boolean;
        question: TQuestion;
        userAnswerData: TAnswerData;
        skipped: false;
      }
    | {
        correct: false;
        question: TQuestion;
        userAnswerData: null;
        skipped: true;
      }
    | null
  >(null);

  const hasStarted = useRef(false);
  const [hasMounted, setHasMounted] = useState(false);

  // Auto-start and mount
  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    setHasMounted(true);

    const initialBatch = generateBatch(batchSize);
    setQuestions(initialBatch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

  useScrollToElement(scrollTargetId ?? '', hasMounted && !!scrollTargetId);

  // Regenerate questions when running low
  useEffect(() => {
    if (questions.length > 0 && currentIndex >= questions.length - 10) {
      const newBatch = generateBatch(batchSize);
      setQuestions((prev) => [...prev, ...newBatch]);
    }
  }, [currentIndex, questions.length, batchSize, generateBatch]);

  const handleAnswer = useCallback(
    (
      answerData: TAnswerData,
      isBlocked: boolean = false,
      onFeedbackStart?: (isCorrect: boolean) => void
    ) => {
      if (isBlocked || showResult) return;

      const currentQuestion = questions[currentIndex];
      const isCorrect = checkAnswer(currentQuestion, answerData);

      setAnswers((prev) => [...prev, isCorrect]);
      setLastAnswer({
        correct: isCorrect,
        question: currentQuestion,
        userAnswerData: answerData,
        skipped: false,
      });
      setShowResult(true);

      onFeedbackStart?.(isCorrect);

      const delay =
        typeof feedbackDelayMs === 'function' ? feedbackDelayMs(isCorrect) : feedbackDelayMs;

      setTimeout(() => {
        setShowResult(false);
        setLastAnswer(null);
        setCurrentIndex((prev) => prev + 1);
      }, delay);
    },
    [currentIndex, questions, showResult, checkAnswer, feedbackDelayMs]
  );

  const handleSkip = useCallback(
    (onFeedbackStart?: (isCorrect: boolean) => void) => {
      if (showResult) return;

      const currentQuestion = questions[currentIndex];

      setAnswers((prev) => [...prev, false]);
      setLastAnswer({
        correct: false,
        question: currentQuestion,
        userAnswerData: null,
        skipped: true,
      });
      setShowResult(true);

      onFeedbackStart?.(false);

      if (skipAutoAdvance) {
        const delay =
          typeof feedbackDelayMs === 'function' ? feedbackDelayMs(false) : feedbackDelayMs;

        setTimeout(() => {
          setShowResult(false);
          setLastAnswer(null);
          setCurrentIndex((prev) => prev + 1);
        }, delay);
      }
    },
    [currentIndex, questions, showResult, feedbackDelayMs, skipAutoAdvance]
  );

  const handleNextAfterSkip = useCallback(() => {
    if (skipAutoAdvance) return;
    setShowResult(false);
    setLastAnswer(null);
    setCurrentIndex((prev) => prev + 1);
  }, [skipAutoAdvance]);

  return {
    currentQuestion: questions[currentIndex] ?? null,
    hasQuestions: questions.length > 0,
    showResult,
    lastAnswer,
    correctCount: answers.filter((a) => a).length,
    incorrectCount: answers.filter((a) => !a).length,
    handleAnswer,
    handleSkip,
    handleNextAfterSkip,
  };
}
