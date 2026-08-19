'use client';

import { useCallback, useEffect, useRef } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { getCornerInfo } from '@blindfold-chess/features/diagonal-quiz';
import type { ActiveField } from '@blindfold-chess/features/diagonal-quiz';
import { useDiagonalInput } from '@blindfold-chess/features/diagonal-quiz/client';
import type { Square } from '@blindfold-chess/types';

import {
  TRAINING_TEXT_ACTION_CLASSES,
  TrainingFooter,
} from '@/app/[locale]/(public)/practice/(challenge)/_components/TrainingFooter';
import { useAlgebraicKeyboardInput } from '@/app/[locale]/(public)/practice/_hooks/use-algebraic-keyboard-input';
import { SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

import { DiagonalAnswerPanel } from '../../_components/DiagonalAnswerPanel';
import { DiagonalQuizIncorrectResultView } from './DiagonalQuizIncorrectResultView';
import { DiagonalQuizSkipResultView } from './DiagonalQuizSkipResultView';

type Props = {
  locale: Locale;
  currentSquare: Square;
  showResult: boolean;
  lastAnswer: {
    correct: boolean;
    question: Square;
    correctDiagonal: string;
    correctAntiDiagonal: string;
    skipped: boolean;
    userDiagonal?: string;
    userAntiDiagonal?: string;
  } | null;
  onAnswer: (diagonal: string, antiDiagonal: string) => void;
  onSkip: () => void;
  onNextAfterSkip: () => void;
  onNextAfterIncorrect: () => void;
  correctCount: number;
  incorrectCount: number;
  onEndTraining: () => void;
};

export function DiagonalQuizTrainingPlaying({
  locale,
  currentSquare,
  showResult,
  lastAnswer,
  onAnswer,
  onSkip,
  onNextAfterSkip,
  onNextAfterIncorrect,
  correctCount,
  incorrectCount,
  onEndTraining,
}: Props) {
  const t = useTranslations('practice.diagonalQuiz');
  const tp = useTranslations('practice');
  const isDisabled = showResult;
  const challengeHref = `/${locale}/practice/diagonal-quiz/challenge`;

  // Incorrect/skip route to their own result views below, so the inline view
  // only ever grades a correct answer. Tint the always-present answer fields
  // green instead of flashing a "Correct" label, which would shift the layout.
  const fieldResult =
    showResult && lastAnswer ? (lastAnswer.correct ? 'correct' : 'incorrect') : null;

  const { singleDiagonal, singleAntiDiagonal } = getCornerInfo(currentSquare);

  const onBothComplete = useCallback(
    (diagonal: string, antiDiagonal: string) => {
      if (isDisabled) return;
      onAnswer(diagonal, antiDiagonal);
    },
    [isDisabled, onAnswer]
  );

  const diagonalInput = useDiagonalInput({
    onBothComplete,
    disabled: isDisabled,
    allowSingleSquareDiagonal: singleDiagonal,
    allowSingleSquareAntiDiagonal: singleAntiDiagonal,
  });
  // Only what this component drives itself; the rest goes to the panel as one
  // object.
  const { setActiveField, handleFilePress, handleRankPress, handleBackspace, reset } =
    diagonalInput;

  useAlgebraicKeyboardInput({
    onFile: handleFilePress,
    onRank: handleRankPress,
    onBackspace: handleBackspace,
    enabled: !isDisabled,
  });

  // Reset input when the question changes
  const prevSquareRef = useRef(currentSquare);
  useEffect(() => {
    if (prevSquareRef.current !== currentSquare) {
      prevSquareRef.current = currentSquare;
      reset();
    }
  }, [currentSquare, reset]);

  // Also reset when showResult transitions from true to false (new question)
  const prevShowResultRef = useRef(showResult);
  useEffect(() => {
    if (prevShowResultRef.current && !showResult) {
      reset();
    }
    prevShowResultRef.current = showResult;
  }, [showResult, reset]);

  const handleFieldClick = (field: ActiveField) => {
    if (isDisabled) return;
    setActiveField(field);
  };

  const isSkipResult = showResult && lastAnswer?.skipped;
  const isIncorrectResult = showResult && lastAnswer && !lastAnswer.correct && !lastAnswer.skipped;

  if (isSkipResult && lastAnswer) {
    return (
      <div className="max-w-md mx-auto">
        <DiagonalQuizSkipResultView
          question={lastAnswer.question}
          correctDiagonal={lastAnswer.correctDiagonal}
          correctAntiDiagonal={lastAnswer.correctAntiDiagonal}
          correctCount={correctCount}
          incorrectCount={incorrectCount}
          challengeHref={challengeHref}
          onNextAfterSkip={onNextAfterSkip}
          onEndTraining={onEndTraining}
        />
      </div>
    );
  }

  if (isIncorrectResult && lastAnswer.userDiagonal && lastAnswer.userAntiDiagonal) {
    return (
      <div className="max-w-md mx-auto">
        <DiagonalQuizIncorrectResultView
          question={lastAnswer.question}
          correctDiagonal={lastAnswer.correctDiagonal}
          correctAntiDiagonal={lastAnswer.correctAntiDiagonal}
          userDiagonal={lastAnswer.userDiagonal}
          userAntiDiagonal={lastAnswer.userAntiDiagonal}
          correctCount={correctCount}
          incorrectCount={incorrectCount}
          challengeHref={challengeHref}
          onNextAfterIncorrect={onNextAfterIncorrect}
          onEndTraining={onEndTraining}
        />
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center">
        <SectionTitle className="mb-4">{t('question', { square: currentSquare })}</SectionTitle>

        <DiagonalAnswerPanel
          currentSquare={currentSquare}
          input={{ ...diagonalInput, singleDiagonal, singleAntiDiagonal, handleFieldClick }}
          isDisabled={isDisabled}
          srResultText={
            showResult && lastAnswer
              ? lastAnswer.correct
                ? tp('correct')
                : t('correctAnswer', {
                    diagonal: lastAnswer.correctDiagonal,
                    antiDiagonal: lastAnswer.correctAntiDiagonal,
                  })
              : null
          }
          labels={{
            diagonal: t('diagonalLabel'),
            antiDiagonal: t('antiDiagonalLabel'),
            selectFile: t('selectFile'),
            selectRank: t('selectRank'),
          }}
          diagonalResult={fieldResult}
          antiDiagonalResult={fieldResult}
        />
      </div>

      <TrainingFooter
        correct={correctCount}
        incorrect={incorrectCount}
        onEndTraining={onEndTraining}
        challengeHref={challengeHref}
      >
        {!isDisabled && (
          <div>
            <button onClick={onSkip} className={TRAINING_TEXT_ACTION_CLASSES}>
              {tp('skip')}
            </button>
          </div>
        )}
      </TrainingFooter>
    </div>
  );
}
