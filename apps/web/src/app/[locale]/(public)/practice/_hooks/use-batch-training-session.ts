import { useCallback, useEffect, useRef, useState } from 'react';

type UseBatchTrainingSessionConfig<TQuestion, TAnswerData> = {
  batchSize?: number;
  generateBatch: (size: number) => TQuestion[];
  checkAnswer: (question: TQuestion, answerParams: TAnswerData) => boolean;
  feedbackDelayMs?: number | ((isCorrect: boolean) => number);
  scrollTargetId?: string;
};

export function useBatchTrainingSession<TQuestion, TAnswerData>({
  batchSize = 100,
  generateBatch,
  checkAnswer,
  feedbackDelayMs = 500,
  scrollTargetId,
}: UseBatchTrainingSessionConfig<TQuestion, TAnswerData>) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [questions, setQuestions] = useState<TQuestion[]>([]);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [lastAnswer, setLastAnswer] = useState<{
    correct: boolean;
    question: TQuestion;
    userAnswerData: TAnswerData;
  } | null>(null);

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

  // Scroll to element after mount
  useEffect(() => {
    if (!hasMounted || !scrollTargetId) return;

    setTimeout(() => {
      const element = document.getElementById(scrollTargetId);
      if (element) {
        element.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    }, 100);
  }, [hasMounted, scrollTargetId]);

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

  return {
    currentQuestion: questions[currentIndex] ?? null,
    hasQuestions: questions.length > 0,
    showResult,
    lastAnswer,
    correctCount: answers.filter((a) => a).length,
    incorrectCount: answers.filter((a) => !a).length,
    handleAnswer,
  };
}
