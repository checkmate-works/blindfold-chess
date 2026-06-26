'use client';

import { useCallback, useEffect, useRef } from 'react';

import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { getCornerInfo } from '@blindfold-chess/features/diagonal-quiz';
import type { ActiveField } from '@blindfold-chess/features/diagonal-quiz';
import { useDiagonalInput } from '@blindfold-chess/features/diagonal-quiz/client';

import { AnswerFeedback } from '@/app/[locale]/(public)/practice/(challenge)/_components/AnswerFeedback';
import { ScoreCounter } from '@/app/[locale]/(public)/practice/(challenge)/_components/ScoreCounter';
import { TrainingChallengeCTA } from '@/app/[locale]/(public)/practice/(challenge)/_components/TrainingChallengeCTA';
import { AlgebraicKeyboardHint } from '@/app/[locale]/(public)/practice/_components/KeyboardHint';
import { useAlgebraicKeyboardInput } from '@/app/[locale]/(public)/practice/_hooks/use-algebraic-keyboard-input';
import { SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

import { ChessCoordinateKeypad } from '../../_components/ChessCoordinateKeypad';
import { DiagonalInputField } from '../../_components/DiagonalInputField';
import { DiagonalQuizIncorrectResultView } from './DiagonalQuizIncorrectResultView';
import { DiagonalQuizSkipResultView } from './DiagonalQuizSkipResultView';

type Props = {
  locale: Locale;
  currentSquare: string;
  showResult: boolean;
  lastAnswer: {
    correct: boolean;
    question: string;
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

  const { singleDiagonal, singleAntiDiagonal } = getCornerInfo(currentSquare);

  const onBothComplete = useCallback(
    (diagonal: string, antiDiagonal: string) => {
      if (isDisabled) return;
      onAnswer(diagonal, antiDiagonal);
    },
    [isDisabled, onAnswer]
  );

  const {
    diagonalStartText,
    diagonalEndText,
    antiDiagonalStartText,
    antiDiagonalEndText,
    activeField,
    setActiveField,
    isDiagonalComplete,
    isAntiDiagonalComplete,
    expectingFile,
    expectingRank,
    isInputtingStart,
    isInputtingEnd,
    handleFilePress,
    handleRankPress,
    handleBackspace,
    handleClear,
    reset,
  } = useDiagonalInput({
    onBothComplete,
    disabled: isDisabled,
    allowSingleSquareDiagonal: singleDiagonal,
    allowSingleSquareAntiDiagonal: singleAntiDiagonal,
  });

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
      <div className="p-8 text-center relative overflow-hidden">
        <div>
          <SectionTitle className="mb-4">{t('question', { square: currentSquare })}</SectionTitle>

          <div className="mb-6">
            <div className="text-6xl font-bold text-foreground mb-4 select-none">
              {currentSquare}
            </div>

            <AnswerFeedback
              isCorrect={lastAnswer?.correct ?? null}
              isVisible={showResult && !!lastAnswer}
              incorrectMessage={
                lastAnswer && !lastAnswer.correct
                  ? t('correctAnswer', {
                      diagonal: lastAnswer.correctDiagonal,
                      antiDiagonal: lastAnswer.correctAntiDiagonal,
                    })
                  : undefined
              }
              className="mb-2"
            />
          </div>

          <div className="-mx-8 sm:mx-0">
            {/* Diagonal Input Display Fields */}
            <div className="space-y-3 mb-6">
              <DiagonalInputField
                label={t('diagonalLabel')}
                isSingleSquare={singleDiagonal}
                activeField={activeField}
                fieldType="diagonal"
                startText={diagonalStartText}
                endText={diagonalEndText}
                isComplete={isDiagonalComplete}
                isDisabled={isDisabled}
                isInputtingStart={isInputtingStart}
                isInputtingEnd={isInputtingEnd}
                onFieldClick={handleFieldClick}
              />

              <DiagonalInputField
                label={t('antiDiagonalLabel')}
                isSingleSquare={singleAntiDiagonal}
                activeField={activeField}
                fieldType="antiDiagonal"
                startText={antiDiagonalStartText}
                endText={antiDiagonalEndText}
                isComplete={isAntiDiagonalComplete}
                isDisabled={isDisabled}
                isInputtingStart={isInputtingStart}
                isInputtingEnd={isInputtingEnd}
                onFieldClick={handleFieldClick}
              />
            </div>

            {/* Step indicator */}
            {!isDisabled && (
              <div className="text-sm text-muted-foreground mb-4">
                {expectingFile ? t('selectFile') : expectingRank ? t('selectRank') : ''}
              </div>
            )}

            {/* Button Input Area */}
            <ChessCoordinateKeypad
              expectingFile={expectingFile}
              expectingRank={expectingRank}
              isDisabled={isDisabled}
              onFilePress={handleFilePress}
              onRankPress={handleRankPress}
              onBackspace={handleBackspace}
              onClear={handleClear}
            />

            <AlgebraicKeyboardHint disabled={isDisabled} />
          </div>
        </div>
      </div>

      <ScoreCounter correct={correctCount} incorrect={incorrectCount} className="mt-8" />

      <div className="mt-6 text-center space-y-2">
        {!isDisabled && (
          <div>
            <button
              onClick={onSkip}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {tp('skip')}
            </button>
          </div>
        )}
        <div>
          <button
            onClick={onEndTraining}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {tp('endTraining')}
          </button>
        </div>
      </div>

      <TrainingChallengeCTA challengeHref={challengeHref} />
    </div>
  );
}
