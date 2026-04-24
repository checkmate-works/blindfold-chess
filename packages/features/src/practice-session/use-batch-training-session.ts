import { useCallback, useEffect, useRef, useState } from "react";

export type UseBatchTrainingSessionConfig<TQuestion, TAnswerData> = {
  batchSize?: number;
  generateBatch: (size: number) => TQuestion[];
  checkAnswer: (question: TQuestion, answerParams: TAnswerData) => boolean;
  feedbackDelayMs?: number | ((isCorrect: boolean) => number);
  skipAutoAdvance?: boolean;
  incorrectAutoAdvance?: boolean;
};

export type UseBatchTrainingSessionReturn<TQuestion, TAnswerData> = {
  currentQuestion: TQuestion | null;
  hasQuestions: boolean;
  showResult: boolean;
  lastAnswer:
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
    | null;
  correctCount: number;
  incorrectCount: number;
  handleAnswer: (
    answerData: TAnswerData,
    isBlocked?: boolean,
    onFeedbackStart?: (isCorrect: boolean) => void,
  ) => void;
  handleSkip: (onFeedbackStart?: (isCorrect: boolean) => void) => void;
  handleNextAfterSkip: () => void;
  handleNextAfterIncorrect: () => void;
};

export function useBatchTrainingSession<TQuestion, TAnswerData>({
  batchSize = 100,
  generateBatch,
  checkAnswer,
  feedbackDelayMs = 500,
  skipAutoAdvance = true,
  incorrectAutoAdvance = true,
}: UseBatchTrainingSessionConfig<
  TQuestion,
  TAnswerData
>): UseBatchTrainingSessionReturn<TQuestion, TAnswerData> {
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

  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    const initialBatch = generateBatch(batchSize);
    setQuestions(initialBatch);
  }, []); // Only run once on mount

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
      onFeedbackStart?: (isCorrect: boolean) => void,
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

      if (isCorrect || incorrectAutoAdvance) {
        const delay =
          typeof feedbackDelayMs === "function"
            ? feedbackDelayMs(isCorrect)
            : feedbackDelayMs;

        setTimeout(() => {
          setShowResult(false);
          setLastAnswer(null);
          setCurrentIndex((prev) => prev + 1);
        }, delay);
      }
    },
    [
      currentIndex,
      questions,
      showResult,
      checkAnswer,
      feedbackDelayMs,
      incorrectAutoAdvance,
    ],
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
          typeof feedbackDelayMs === "function"
            ? feedbackDelayMs(false)
            : feedbackDelayMs;

        setTimeout(() => {
          setShowResult(false);
          setLastAnswer(null);
          setCurrentIndex((prev) => prev + 1);
        }, delay);
      }
    },
    [currentIndex, questions, showResult, feedbackDelayMs, skipAutoAdvance],
  );

  const advanceToNext = useCallback(() => {
    setShowResult(false);
    setLastAnswer(null);
    setCurrentIndex((prev) => prev + 1);
  }, []);

  const handleNextAfterSkip = useCallback(() => {
    if (skipAutoAdvance) return;
    advanceToNext();
  }, [skipAutoAdvance, advanceToNext]);

  const handleNextAfterIncorrect = useCallback(() => {
    if (incorrectAutoAdvance) return;
    advanceToNext();
  }, [incorrectAutoAdvance, advanceToNext]);

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
    handleNextAfterIncorrect,
  };
}
