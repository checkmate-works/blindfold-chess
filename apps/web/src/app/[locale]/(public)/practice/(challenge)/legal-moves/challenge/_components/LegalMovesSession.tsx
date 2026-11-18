'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import type { RemoteChallengePort } from '@blindfold-chess/features/challenge-attempt';
import {
  type LegalMovesPieceSelection,
  legalMovesPiecesForSelection,
} from '@blindfold-chess/features/legal-moves';
import { useLegalMovesSession } from '@blindfold-chess/features/legal-moves/client';

import { CHALLENGE_TIME_LIMIT, MISTAKE_LIMIT } from '@/lib/challenge/constants';

import { ChallengeAttemptGate } from '@/app/[locale]/(public)/practice/(challenge)/_components/ChallengeAttemptGate';
import { useChallengeResultSave } from '@/app/[locale]/(public)/practice/(challenge)/_hooks/use-challenge-result-save';
import { useQuitConfirm } from '@/app/[locale]/(public)/practice/(challenge)/_hooks/use-quit-confirm';
import { PracticeResultSkeleton } from '@/app/[locale]/(public)/practice/_components/PracticeResultSkeleton';
import { useScrollToElement } from '@/app/[locale]/(public)/practice/_hooks/use-scroll-to-element';
import type { Locale } from '@/app/[locale]/_lib/types';

import { LegalMovesPlaySkeleton } from '../../_components/LegalMovesPlaySkeleton';
import { isLegalMove } from '../../_lib/legal-moves-api';
import type { MoveQuestion } from '../../_lib/types';
import { LegalMovesPlaying } from './LegalMovesPlaying';

type Props = {
  locale: Locale;
  selectedPiece: LegalMovesPieceSelection;
};

export default function LegalMovesSession({ locale, selectedPiece }: Props) {
  const settings = useMemo(() => ({ selectedPiece }), [selectedPiece]);

  return (
    <ChallengeAttemptGate<MoveQuestion>
      menuType="legal_moves"
      settings={settings}
      fallback={<LegalMovesPlaySkeleton showHeader />}
    >
      {(attempt) => (
        <LegalMovesChallengeSession
          locale={locale}
          selectedPiece={selectedPiece}
          attemptId={attempt.attemptId}
          remote={attempt.remote}
        />
      )}
    </ChallengeAttemptGate>
  );
}

type SessionProps = {
  locale: Locale;
  selectedPiece: LegalMovesPieceSelection;
  attemptId: string | null;
  remote: RemoteChallengePort<MoveQuestion> | undefined;
};

function LegalMovesChallengeSession({ locale, selectedPiece, attemptId, remote }: SessionProps) {
  // The same piece list the server generates the attempt's questions from.
  const selectedPieces = useMemo(
    () => legalMovesPiecesForSelection(selectedPiece),
    [selectedPiece]
  );
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
    remoteFailed,
    awaitingServer,
    handleAnswer: hookHandleAnswer,
    togglePause,
  } = useLegalMovesSession({
    timeLimit: CHALLENGE_TIME_LIMIT,
    selectedPieces,
    mistakeAllowance: MISTAKE_LIMIT,
    remote,
    disablePause: true,
  });

  useScrollToElement('legal-moves-session');

  const { showQuitModal, handleQuitRequest, handleQuitConfirm, handleQuitCancel } = useQuitConfirm({
    locale,
    moduleSlug: 'legal-moves',
    isPaused,
    togglePause,
  });

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

  useChallengeResultSave({
    isFinished,
    totalAnswers: correctCount + incorrectCount,
    resultUrl,
    attemptId,
    remoteFailed,
    moduleName: 'legal_moves',
  });

  if (isFinished) {
    return <PracticeResultSkeleton grantsExp showsSignUpBanner showsRecordSection />;
  }

  if (!currentQuestion) {
    return <LegalMovesPlaySkeleton showHeader />;
  }

  return (
    <div id="legal-moves-session" className="min-h-screen">
      <LegalMovesPlaying
        currentQuestion={currentQuestion}
        awaitingServer={awaitingServer}
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
