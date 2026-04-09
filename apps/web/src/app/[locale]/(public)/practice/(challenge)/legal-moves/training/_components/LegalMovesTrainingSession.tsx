'use client';

import { useCallback } from 'react';

import { useRouter } from 'next/navigation';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';

import { useBatchTrainingSession } from '@/app/[locale]/(public)/practice/(challenge)/_hooks/use-batch-training-session';
import { PracticeResultSkeleton } from '@/app/[locale]/(public)/practice/_components/PracticeResultSkeleton';
import { useCountdown } from '@/app/[locale]/(public)/practice/_hooks/use-countdown';
import { useToast } from '@/app/[locale]/_contexts/ToastContext';
import type { Locale } from '@/app/[locale]/_lib/types';

import type { MoveQuestion, PieceType } from '../../_lib/types';
import { generateBalancedMoveQuestions, isLegalMove } from '../../_lib/utils';
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

  const { countdown } = useCountdown();

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
    scrollTargetId: 'legal-moves-training-session',
    feedbackDelayMs: 500,
  });

  const onAnswer = useCallback(
    (userAnswer: boolean) => {
      if (!currentQuestion) return;
      const isLegal = isLegalMove(currentQuestion.from, currentQuestion.to, currentQuestion.piece);
      handleAnswer({ userAnswer, isLegal }, countdown !== null);
    },
    [handleAnswer, countdown, currentQuestion]
  );

  const handleEndTraining = useCallback(() => {
    showToast(tp('trainingEnded'), 'info');
    router.push(`/${locale}/practice/legal-moves`);
  }, [showToast, tp, router, locale]);

  // Show loading state while questions are being generated
  if (!hasQuestions || !currentQuestion) {
    return <PracticeResultSkeleton />;
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
        countdown={countdown}
        correctCount={correctCount}
        incorrectCount={incorrectCount}
        onEndTraining={handleEndTraining}
      />
    </div>
  );
}
