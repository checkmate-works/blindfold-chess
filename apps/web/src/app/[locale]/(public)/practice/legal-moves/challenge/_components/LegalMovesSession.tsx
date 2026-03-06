'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { PracticeResultSkeleton } from '@/app/[locale]/(public)/practice/_components/PracticeResultSkeleton';
import { useScrollToElement } from '@/app/[locale]/(public)/practice/_hooks/use-scroll-to-element';
import { useTimedSession } from '@/app/[locale]/(public)/practice/_hooks/use-timed-session';
import { saveLegalMovesResult } from '@/app/[locale]/(public)/practice/legal-moves/_actions/save-result';
import { useAuth } from '@/app/[locale]/_contexts/AuthContext';
import type { Locale } from '@/app/[locale]/_lib/types';

import type { MoveQuestion, PieceType } from '../../_lib/types';
import { generateBalancedMoveQuestions, isLegalMove } from '../../_lib/utils';
import { LegalMovesPlaying } from './LegalMovesPlaying';

type Props = {
  locale: Locale;
  initialTimeLimit: number;
  selectedPieces: PieceType[];
};

const MAX_MISTAKES = 3;

export default function LegalMovesSession({ locale, initialTimeLimit, selectedPieces }: Props) {
  const router = useRouter();
  const { user } = useAuth();
  const t = useTranslations('practice.legalMoves');

  const getQuestion = (from: string, to: string) => t('questionFormat', { from, to });

  // Batch-based question generation
  const questionsRef = useRef<MoveQuestion[]>([]);
  const indexRef = useRef(0);

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
    totalCount,
  } = useTimedSession<MoveQuestion>({
    timeLimit: initialTimeLimit,
    generateQuestion,
    mistakeAllowance: MAX_MISTAKES,
  });

  useScrollToElement('legal-moves-session');

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

  // Save result and redirect on finish
  const savedRef = useRef(false);
  useEffect(() => {
    if (!isFinished || savedRef.current) return;
    savedRef.current = true;

    const total = correctCount + incorrectCount;

    const params = new URLSearchParams();
    params.set('score', correctCount.toString());
    params.set('total', total.toString());
    params.set('time', totalTime.toString());
    params.set('timeLimit', initialTimeLimit.toString());
    params.set('pieces', selectedPieces.join(','));

    const resultUrl = `/${locale}/practice/legal-moves/result?${params.toString()}`;

    if (user && totalCount > 0) {
      saveLegalMovesResult({
        correctAnswers: correctCount,
        incorrectAnswers: incorrectCount,
        timeTaken: totalTime,
        timeLimit: initialTimeLimit,
        selectedPieces,
        mistakeAllowance: MAX_MISTAKES,
      })
        .catch(() => {
          // Silently ignore save failures - result display is unaffected
        })
        .finally(() => {
          router.push(resultUrl);
        });
    } else {
      router.push(resultUrl);
    }
  }, [
    isFinished,
    correctCount,
    incorrectCount,
    totalCount,
    locale,
    router,
    initialTimeLimit,
    selectedPieces,
    totalTime,
    user,
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
        remainingLives={MAX_MISTAKES - incorrectCount}
        maxLives={MAX_MISTAKES}
      />
    </div>
  );
}
