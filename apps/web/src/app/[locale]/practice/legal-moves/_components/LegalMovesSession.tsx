'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import type { Locale } from '@/app/[locale]/_lib/types';

import { PracticeResultSkeleton } from '../../_components/PracticeResultSkeleton';
import { useGameTimer } from '../../_hooks/useGameTimer';
import type { MoveQuestion, PieceType } from '../_lib/types';
import { generateBalancedMoveQuestions, isLegalMove } from '../_lib/utils';
import { LegalMovesPlaying } from './LegalMovesPlaying';

type Props = {
  locale: Locale;
  initialTimeLimit: number;
  selectedPieces: PieceType[];
};

export default function LegalMovesSession({ locale, initialTimeLimit, selectedPieces }: Props) {
  const router = useRouter();
  const t = useTranslations('practice.legalMoves');

  const getQuestion = (from: string, to: string) => t('questionFormat', { from, to });

  const timeLimit = initialTimeLimit;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [questions, setQuestions] = useState<MoveQuestion[]>([]);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [isFinished, setIsFinished] = useState(false);
  const [showResult, setShowResult] = useState<boolean>(false);
  const [lastAnswer, setLastAnswer] = useState<{
    correct: boolean;
    userAnswer: boolean;
    isLegal: boolean;
  } | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const hasStarted = useRef(false);

  // Countdown state
  const [countdown, setCountdown] = useState<number | null>(3);
  const [hasMounted, setHasMounted] = useState(false);

  // Timer hook
  const isPlaying =
    questions.length > 0 && !isFinished && countdown === null && !showResult && !isPaused;

  const { timeElapsed, totalTime } = useGameTimer({
    timeLimit,
    isActive: isPlaying,
    onTimeLimitReached: useCallback(() => setIsFinished(true), []),
  });

  const togglePause = useCallback(() => {
    if (isPaused) {
      // Logic when Resuming
      // setQuestionStartTime(Date.now()); // Removed unused
    } else {
      // Logic when Pausing
    }
    setIsPaused((prev) => !prev);
  }, [isPaused]);

  // Auto-start the game on mount
  useEffect(() => {
    if (hasStarted.current) return;
    hasStarted.current = true;
    setHasMounted(true);

    const newQuestions = generateBalancedMoveQuestions(100, selectedPieces);
    setQuestions(newQuestions);
    // setQuestionStartTime(Date.now()); // Removed unused
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
      if (isFinished || countdown !== null || showResult || isPaused) return;

      const currentQuestion = questions[currentIndex];
      const isLegal = isLegalMove(currentQuestion.from, currentQuestion.to, currentQuestion.piece);
      const isCorrect = userAnswer === isLegal;

      // Record answer
      setAnswers((prev) => [...prev, isCorrect]);
      setLastAnswer({ correct: isCorrect, userAnswer, isLegal });
      setShowResult(true);

      // Move to next question
      setTimeout(() => {
        setShowResult(false);
        setLastAnswer(null);
        setCurrentIndex((prev) => prev + 1);
        // setQuestionStartTime(Date.now()); // Removed unused
      }, 500);
    },
    [currentIndex, questions, isFinished, countdown, showResult, isPaused]
  );

  // Redirect on finish
  useEffect(() => {
    if (isFinished) {
      const correct = answers.filter((a) => a).length;
      const total = answers.length;

      const params = new URLSearchParams();
      params.set('score', correct.toString());
      params.set('total', total.toString());
      params.set('time', totalTime.toString());

      // Params for retry
      params.set('timeLimit', timeLimit.toString());
      params.set('pieces', selectedPieces.join(','));

      router.push(`/${locale}/practice/legal-moves/result?${params.toString()}`);
    }
  }, [isFinished, answers, locale, router, timeLimit, selectedPieces, totalTime]);

  if (isFinished) {
    return <PracticeResultSkeleton />;
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
    <div id="legal-moves-session" className="min-h-screen">
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
        isPaused={isPaused}
        onTogglePause={togglePause}
      />
    </div>
  );
}
