'use client';

import { useCallback } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { useBatchTrainingSession } from '@blindfold-chess/features/practice-session';

import { useTrainingSessionShell } from '@/app/[locale]/(public)/practice/(challenge)/_hooks/use-training-session-shell';
import type { Locale } from '@/app/[locale]/_lib/types';

import { LegalMovesPlaySkeleton } from '../../_components/LegalMovesPlaySkeleton';
import { generateBalancedMoveQuestions, isLegalMove } from '../../_lib/legal-moves-api';
import type { MoveQuestion, PieceType } from '../../_lib/types';
import { LegalMovesTrainingPlaying } from './LegalMovesTrainingPlaying';

type Props = {
  locale: Locale;
  selectedPieces: PieceType[];
};

const BATCH_SIZE = 100;

export default function LegalMovesTrainingSession({ locale, selectedPieces }: Props) {
  const t = useTranslations('practice.legalMoves');

  const getQuestion = (from: string, to: string) => t('questionFormat', { from, to });

  const {
    currentQuestion,
    hasQuestions,
    showResult,
    lastAnswer,
    correctCount,
    incorrectCount,
    handleAnswer,
  } = useBatchTrainingSession<MoveQuestion, { userAnswer: boolean; isLegal: boolean }>({
    batchSize: BATCH_SIZE,
    generateBatch: () => generateBalancedMoveQuestions(BATCH_SIZE, selectedPieces),
    checkAnswer: (question, { userAnswer, isLegal }) => userAnswer === isLegal,
    feedbackDelayMs: 500,
  });

  const { sessionElementId, handleEndTraining } = useTrainingSessionShell({
    locale,
    slug: 'legal-moves',
    scrollEnabled: hasQuestions,
  });

  const onAnswer = useCallback(
    (userAnswer: boolean) => {
      if (!currentQuestion) return;
      const isLegal = isLegalMove(currentQuestion.from, currentQuestion.to, currentQuestion.piece);
      handleAnswer({ userAnswer, isLegal });
    },
    [handleAnswer, currentQuestion]
  );

  // Show loading state while questions are being generated
  if (!hasQuestions || !currentQuestion) {
    return <LegalMovesPlaySkeleton />;
  }

  return (
    <div id={sessionElementId} className="min-h-screen">
      <LegalMovesTrainingPlaying
        locale={locale}
        currentQuestion={currentQuestion}
        showResult={showResult}
        lastAnswer={
          lastAnswer && !lastAnswer.skipped
            ? {
                correct: lastAnswer.correct,
                userAnswer: lastAnswer.userAnswerData.userAnswer,
                isLegal: lastAnswer.userAnswerData.isLegal,
              }
            : null
        }
        onAnswer={onAnswer}
        getQuestion={getQuestion}
        correctCount={correctCount}
        incorrectCount={incorrectCount}
        onEndTraining={handleEndTraining}
      />
    </div>
  );
}
