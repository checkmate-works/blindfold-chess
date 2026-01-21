'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';

import type { Locale } from '@/app/[locale]/_lib/types';
import { PracticeResult } from '@/app/[locale]/practice/_components/PracticeResult';

import type { MoveQuestion, PieceType } from '../_lib/types';
import { generateBalancedMoveQuestions, isLegalMove } from '../_lib/utils';
import { LegalMovesPlaying } from './LegalMovesPlaying';

type Props = {
  locale: Locale;
  initialTimeLimit: number;
  selectedPieces: PieceType[];
};

type GameStats = {
  correct: number;
  incorrect: number;
  totalTime: number;
  averageTime: number;
};

export default function LegalMovesSession({ locale, initialTimeLimit, selectedPieces }: Props) {
  const t = useTranslations('practice.legalMoves');
  const tPractice = useTranslations('practice');

  const getQuestion = (from: string, to: string) => t('questionFormat', { from, to });

  const timeLimit = initialTimeLimit;
  const [timeRemaining, setTimeRemaining] = useState(timeLimit);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [questions, setQuestions] = useState<MoveQuestion[]>([]);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [questionStartTime, setQuestionStartTime] = useState<number>(0);
  const [questionTimes, setQuestionTimes] = useState<number[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [showResult, setShowResult] = useState<boolean>(false);
  const [lastAnswer, setLastAnswer] = useState<{
    correct: boolean;
    userAnswer: boolean;
    isLegal: boolean;
  } | null>(null);
  const timerRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const hasStarted = useRef(false);

  // Auto-start the game on mount
  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;

    const newQuestions = generateBalancedMoveQuestions(100, selectedPieces);
    setQuestions(newQuestions);
    setQuestionStartTime(Date.now());
  }, [selectedPieces]);

  // Timer effect
  useEffect(() => {
    if (questions.length === 0 || isFinished) return;

    timerRef.current = setInterval(() => {
      setTimeRemaining((prev: number) => {
        if (prev <= 1) {
          setIsFinished(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [questions.length, isFinished]);

  const handleAnswer = useCallback(
    (userAnswer: boolean) => {
      if (isFinished) return;

      const currentQuestion = questions[currentIndex];
      const isLegal = isLegalMove(currentQuestion.from, currentQuestion.to, currentQuestion.piece);
      const isCorrect = userAnswer === isLegal;

      // Update timing
      const now = Date.now();
      const questionTime = now - questionStartTime;
      setQuestionTimes((prev) => [...prev, questionTime / 1000]);

      // Record answer
      setAnswers((prev) => [...prev, isCorrect]);
      setLastAnswer({ correct: isCorrect, userAnswer, isLegal });
      setShowResult(true);

      // Move to next question
      setTimeout(() => {
        setShowResult(false);
        setCurrentIndex((prev) => prev + 1);
        setQuestionStartTime(Date.now());
      }, 500);
    },
    [currentIndex, questions, isFinished, questionStartTime]
  );

  const getStats = (): GameStats => {
    const correct = answers.filter((a) => a).length;
    const incorrect = answers.filter((a) => !a).length;
    const averageTime =
      questionTimes.length > 0
        ? questionTimes.reduce((a, b) => a + b, 0) / questionTimes.length
        : 0;

    return { correct, incorrect, totalTime: 0, averageTime };
  };

  const handlePlayAgain = () => {
    // Reset and restart
    const newQuestions = generateBalancedMoveQuestions(100, selectedPieces);
    setQuestions(newQuestions);
    setCurrentIndex(0);
    setAnswers([]);
    setQuestionTimes([]);
    setTimeRemaining(timeLimit);
    setShowResult(false);
    setLastAnswer(null);
    setIsFinished(false);
    setQuestionStartTime(Date.now());
  };

  if (isFinished) {
    const stats = getStats();
    const total = answers.length;
    const accuracy = total > 0 ? (stats.correct / total) * 100 : 0;
    const timeElapsed = timeLimit - timeRemaining;

    return (
      <PracticeResult
        score={{
          correct: stats.correct,
          total,
          accuracy,
          timeElapsed,
          averageTime: stats.averageTime,
        }}
        onTryAgain={handlePlayAgain}
        locale={locale}
        labels={{
          correctAnswers: t('correctAnswers'),
          accuracy: t('accuracy'),
          timeTaken: t('timeTaken'),
          averageTime: t('averageTime'),
          tryAgain: tPractice('tryAgain'),
          morePractice: tPractice('morePractice'),
        }}
      />
    );
  }

  // Show loading state while questions are being generated
  if (questions.length === 0 || !questions[currentIndex]) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto"></div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];
  const timeElapsed = timeLimit - timeRemaining;

  return (
    <LegalMovesPlaying
      currentQuestion={currentQuestion}
      timeRemaining={timeRemaining}
      timeLimit={timeLimit}
      timeElapsed={timeElapsed}
      showResult={showResult}
      lastAnswer={lastAnswer}
      onAnswer={handleAnswer}
      getQuestion={getQuestion}
    />
  );
}
