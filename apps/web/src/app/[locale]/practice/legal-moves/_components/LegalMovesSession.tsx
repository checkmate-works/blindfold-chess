'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';

import type { Locale } from '@/app/[locale]/_lib/types';
import { PracticeResult } from '@/app/[locale]/practice/_components/PracticeResult';

import { useGameTimer } from '../../_hooks/useGameTimer';
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
  const hasStarted = useRef(false);

  // Countdown state
  const [countdown, setCountdown] = useState<number | null>(3);
  const [hasMounted, setHasMounted] = useState(false);

  // Timer hook
  const isPlaying = questions.length > 0 && !isFinished && countdown === null && !showResult;

  const {
    timeElapsed,
    totalTime,
    reset: resetTimer,
  } = useGameTimer({
    timeLimit,
    isActive: isPlaying,
    onTimeLimitReached: useCallback(() => setIsFinished(true), []),
  });

  // Auto-start the game on mount
  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    setHasMounted(true);

    const newQuestions = generateBalancedMoveQuestions(100, selectedPieces);
    setQuestions(newQuestions);
    setQuestionStartTime(Date.now());
  }, [selectedPieces]);

  // Scroll to session element after mount
  useEffect(() => {
    if (!hasMounted) return;

    // Tiny delay to ensure DOM is ready
    setTimeout(() => {
      const element = document.getElementById('legal-moves-session');
      if (element) {
        element.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    }, 100);
  }, [hasMounted]);

  // Countdown effect
  useEffect(() => {
    if (countdown === null) return;

    if (countdown === 0) {
      const timer = setTimeout(() => {
        setCountdown(null);
      }, 500); // Show "START!" for 0.5s
      return () => clearTimeout(timer);
    }

    const timer = setTimeout(() => {
      setCountdown((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearTimeout(timer);
  }, [countdown]);

  const handleAnswer = useCallback(
    (userAnswer: boolean) => {
      if (isFinished || countdown !== null || showResult) return;

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
    [currentIndex, questions, isFinished, questionStartTime, countdown, showResult]
  );

  const getStats = (): GameStats => {
    const correct = answers.filter((a) => a).length;
    const incorrect = answers.filter((a) => !a).length;
    const averageTime =
      questionTimes.length > 0
        ? questionTimes.reduce((a, b) => a + b, 0) / questionTimes.length
        : 0;

    return { correct, incorrect, totalTime, averageTime };
  };

  const handlePlayAgain = () => {
    // Reset and restart
    const newQuestions = generateBalancedMoveQuestions(100, selectedPieces);
    setQuestions(newQuestions);
    setCurrentIndex(0);
    setAnswers([]);
    setQuestionTimes([]);
    setShowResult(false);
    setLastAnswer(null);
    setIsFinished(false);
    setQuestionStartTime(Date.now());

    // Reset timer
    resetTimer();
  };

  if (isFinished) {
    const stats = getStats();
    const total = answers.length;
    const accuracy = total > 0 ? (stats.correct / total) * 100 : 0;

    return (
      <PracticeResult
        score={{
          correct: stats.correct,
          total,
          accuracy,
          timeElapsed: timeLimit,
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

  return (
    <div id="legal-moves-session">
      <LegalMovesPlaying
        currentQuestion={currentQuestion}
        timeRemaining={Math.max(0, timeLimit - timeElapsed)}
        timeLimit={timeLimit}
        timeElapsed={timeElapsed}
        showResult={showResult}
        lastAnswer={lastAnswer}
        onAnswer={handleAnswer}
        getQuestion={getQuestion}
        countdown={countdown}
        correctCount={answers.filter((a) => a).length}
        incorrectCount={answers.filter((a) => !a).length}
      />
    </div>
  );
}
