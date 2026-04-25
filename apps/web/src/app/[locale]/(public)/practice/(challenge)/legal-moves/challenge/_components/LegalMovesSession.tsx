'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useRouter } from 'next/navigation';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { useLegalMovesSession } from '@blindfold-chess/features/legal-moves/client';

import { CHALLENGE_TIME_LIMIT, MISTAKE_LIMIT } from '@/lib/challenge/constants';

import { useChallengeResultSave } from '@/app/[locale]/(public)/practice/(challenge)/_hooks/use-challenge-result-save';
import { saveLegalMovesResult } from '@/app/[locale]/(public)/practice/(challenge)/legal-moves/_actions/save-result';
import { PracticeResultSkeleton } from '@/app/[locale]/(public)/practice/_components/PracticeResultSkeleton';
import { useScrollToElement } from '@/app/[locale]/(public)/practice/_hooks/use-scroll-to-element';
import type { Locale } from '@/app/[locale]/_lib/types';

import type { PieceType } from '../../_lib/types';
import { isLegalMove } from '../../_lib/utils';
import { LegalMovesPlaying } from './LegalMovesPlaying';

type Props = {
  locale: Locale;
  selectedPieces: PieceType[];
  selectedPiece: string;
};

export default function LegalMovesSession({ locale, selectedPieces, selectedPiece }: Props) {
  const router = useRouter();
  const t = useTranslations('practice.legalMoves');

  const getQuestion = (from: string, to: string) => t('questionFormat', { from, to });

  // Module-specific feedback state for detailed answer display
  const [lastAnswer, setLastAnswer] = useState<{
    correct: boolean;
    userAnswer: boolean;
    isLegal: boolean;
  } | null>(null);

  const {
    currentQuestion,
    timeRemaining,
    timeElapsed,
    correctCount,
    incorrectCount,
    showFeedback,
    isFinished,
    countdown,
    isPaused,
    handleAnswer: hookHandleAnswer,
    togglePause,
  } = useLegalMovesSession({
    timeLimit: CHALLENGE_TIME_LIMIT,
    selectedPieces,
    mistakeAllowance: MISTAKE_LIMIT,
  });

  useScrollToElement('legal-moves-session');

  const [showQuitModal, setShowQuitModal] = useState(false);

  const handleQuitRequest = useCallback(() => {
    if (!isPaused) togglePause();
    setShowQuitModal(true);
  }, [isPaused, togglePause]);

  const handleQuitConfirm = useCallback(() => {
    router.push(`/${locale}/practice/legal-moves/challenge`);
  }, [router, locale]);

  const handleQuitCancel = useCallback(() => {
    setShowQuitModal(false);
    if (isPaused) togglePause();
  }, [isPaused, togglePause]);

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
      hookHandleAnswer(userAnswer);
    },
    [currentQuestion, hookHandleAnswer]
  );

  // Save result and redirect on finish
  const resultUrl = useMemo(() => {
    const params = new URLSearchParams();
    params.set('score', correctCount.toString());
    params.set('total', (correctCount + incorrectCount).toString());
    params.set('time', timeElapsed.toString());
    params.set('piece', selectedPiece);
    return `/${locale}/practice/legal-moves/result?${params.toString()}`;
  }, [correctCount, incorrectCount, timeElapsed, selectedPiece, locale]);

  const saveResult = useCallback(
    () =>
      saveLegalMovesResult({
        correctAnswers: correctCount,
        incorrectAnswers: incorrectCount,
        timeTaken: timeElapsed,
        selectedPiece,
      }),
    [correctCount, incorrectCount, timeElapsed, selectedPiece]
  );

  useChallengeResultSave({
    isFinished,
    totalAnswers: correctCount + incorrectCount,
    resultUrl,
    saveResult,
    moduleName: 'legal_moves',
  });

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
        timeLimit={CHALLENGE_TIME_LIMIT}
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
        remainingLives={MISTAKE_LIMIT - incorrectCount}
        maxLives={MISTAKE_LIMIT}
        onQuitRequest={handleQuitRequest}
        showQuitModal={showQuitModal}
        onQuitConfirm={handleQuitConfirm}
        onQuitCancel={handleQuitCancel}
      />
    </div>
  );
}
