'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import type { Locale } from '@/app/[locale]/_lib/types';
import { PracticeResultSkeleton } from '@/app/[locale]/practice/_components/PracticeResultSkeleton';
import { useTimedSession } from '@/app/[locale]/practice/_hooks/use-timed-session';

import type { MoveQuestion, PieceType } from '../../_lib/types';
import { generateBalancedMoveQuestions, isLegalMove } from '../../_lib/utils';
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

  // Batch-based question generation
  const questionsRef = useRef<MoveQuestion[]>([]);
  const indexRef = useRef(0);
  const hasMounted = useRef(false);

  // Module-specific feedback state
  const [lastAnswer, setLastAnswer] = useState<{
    correct: boolean;
    userAnswer: boolean;
    isLegal: boolean;
  } | null>(null);

  const generateQuestion = useCallback((): MoveQuestion => {
    if (questionsRef.current.length === 0) {
      questionsRef.current = generateBalancedMoveQuestions(100, selectedPieces);
    }
    if (indexRef.current >= questionsRef.current.length) {
      questionsRef.current = [
        ...questionsRef.current,
        ...generateBalancedMoveQuestions(100, selectedPieces),
      ];
    }
    const question = questionsRef.current[indexRef.current];
    indexRef.current += 1;
    return question;
  }, [selectedPieces]);

  const {
    currentQuestion,
    timeRemaining,
    timeElapsed,
    totalTime,
    correctCount,
    incorrectCount,
    showFeedback,
    isFinished,
    countdown,
    isPaused,
    handleAnswer: hookHandleAnswer,
    togglePause,
  } = useTimedSession<MoveQuestion>({
    timeLimit: initialTimeLimit,
    generateQuestion,
  });

  // Scroll to session element after mount
  useEffect(() => {
    if (hasMounted.current) return;
    hasMounted.current = true;

    setTimeout(() => {
      const element = document.getElementById('legal-moves-session');
      if (element) {
        element.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    }, 100);
  }, []);

  // Clear module-specific feedback state when hook feedback ends
  useEffect(() => {
    if (!showFeedback) {
      setLastAnswer(null);
    }
  }, [showFeedback]);

  const handleAnswer = useCallback(
    (userAnswer: boolean) => {
      if (!currentQuestion) return;

      const legal = isLegalMove(currentQuestion.from, currentQuestion.to, currentQuestion.piece);
      const isCorrect = userAnswer === legal;

      setLastAnswer({ correct: isCorrect, userAnswer, isLegal: legal });
      hookHandleAnswer(isCorrect);
    },
    [currentQuestion, hookHandleAnswer]
  );

  // Redirect on finish
  useEffect(() => {
    if (isFinished) {
      const total = correctCount + incorrectCount;

      const params = new URLSearchParams();
      params.set('score', correctCount.toString());
      params.set('total', total.toString());
      params.set('time', totalTime.toString());
      params.set('timeLimit', initialTimeLimit.toString());
      params.set('pieces', selectedPieces.join(','));

      router.push(`/${locale}/practice/legal-moves/result?${params.toString()}`);
    }
  }, [
    isFinished,
    correctCount,
    incorrectCount,
    locale,
    router,
    initialTimeLimit,
    selectedPieces,
    totalTime,
  ]);

  if (isFinished) {
    return <PracticeResultSkeleton />;
  }

  if (!currentQuestion) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-foreground mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div id="legal-moves-session" className="min-h-screen">
      <LegalMovesPlaying
        currentQuestion={currentQuestion}
        timeRemaining={timeRemaining}
        timeLimit={initialTimeLimit}
        timeElapsed={timeElapsed}
        showResult={showFeedback}
        lastAnswer={lastAnswer}
        onAnswer={handleAnswer}
        getQuestion={getQuestion}
        countdown={countdown}
        correctCount={correctCount}
        incorrectCount={incorrectCount}
        isPaused={isPaused}
        onTogglePause={togglePause}
      />
    </div>
  );
}
