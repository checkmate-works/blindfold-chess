'use client';

import { useCallback } from 'react';

import { useRouter } from 'next/navigation';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { useBatchTrainingSession } from '@blindfold-chess/features/practice-session';

import { useScrollToElement } from '@/app/[locale]/(public)/practice/_hooks/use-scroll-to-element';
import { useToast } from '@/app/[locale]/_contexts/ToastContext';
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
  const router = useRouter();
  const { showToast } = useToast();
  const t = useTranslations('practice.legalMoves');
  const tp = useTranslations('practice');

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

  useScrollToElement('legal-moves-training-session', hasQuestions);

  const onAnswer = useCallback(
    (userAnswer: boolean) => {
      if (!currentQuestion) return;
      const isLegal = isLegalMove(currentQuestion.from, currentQuestion.to, currentQuestion.piece);
      handleAnswer({ userAnswer, isLegal });
    },
    [handleAnswer, currentQuestion]
  );

  const handleEndTraining = useCallback(() => {
    showToast(tp('trainingEnded'), 'info');
    router.push(`/${locale}/practice/legal-moves`);
  }, [showToast, tp, router, locale]);

  // Show loading state while questions are being generated
  if (!hasQuestions || !currentQuestion) {
    return <LegalMovesPlaySkeleton />;
  }

  return (
    <div id="legal-moves-training-session" className="min-h-screen">
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
