'use client';

import { useCallback, useEffect, useRef } from 'react';

import { useTranslations } from 'next-intl';

import { BoardOverlay, Button } from '@/app/_components';
import { getCornerInfo } from '@blindfold-chess/features/diagonal-quiz';

import { AnswerFeedback } from '@/app/[locale]/(public)/practice/_components/AnswerFeedback';
import { ScoreCounter } from '@/app/[locale]/(public)/practice/_components/ScoreCounter';
import { SectionTitle } from '@/app/[locale]/_components';

import { ChessCoordinateKeypad } from '../../_components/ChessCoordinateKeypad';
import { DiagonalInputField } from '../../_components/DiagonalInputField';
import type { ActiveField } from '../../_hooks/use-diagonal-input';
import { useDiagonalInput } from '../../_hooks/use-diagonal-input';

type Props = {
  currentSquare: string;
  showResult: boolean;
  lastAnswer: {
    correct: boolean;
    correctDiagonal: string;
    correctAntiDiagonal: string;
  } | null;
  onAnswer: (diagonal: string, antiDiagonal: string) => void;
  countdown: number | null;
  correctCount: number;
  incorrectCount: number;
  onEndTraining: () => void;
};

export function DiagonalQuizTrainingPlaying({
  currentSquare,
  showResult,
  lastAnswer,
  onAnswer,
  countdown,
  correctCount,
  incorrectCount,
  onEndTraining,
}: Props) {
  const t = useTranslations('practice.diagonalQuiz');
  const tp = useTranslations('practice');
  const isDisabled = showResult || countdown !== null;

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

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-card rounded-xl border border-border p-8 text-center relative overflow-hidden shadow-sm">
        {/* Countdown Overlay */}
        <BoardOverlay isVisible={countdown !== null} className="backdrop-blur-md z-50">
          <span className="text-8xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] dark:drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] animate-in zoom-in duration-300">
            {countdown !== null && (countdown > 0 ? countdown : 'START!')}
          </span>
        </BoardOverlay>

        <div>
          <SectionTitle className="mb-4">{t('question', { square: currentSquare })}</SectionTitle>

          <div className="mb-6">
            <div className="text-6xl font-bold text-foreground mb-4">{currentSquare}</div>

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
        </div>
      </div>

      <ScoreCounter correct={correctCount} incorrect={incorrectCount} className="mt-8" />

      <div className="mt-6">
        <Button onClick={onEndTraining} variant="outline" size="lg" className="w-full">
          {tp('endTraining')}
        </Button>
      </div>
    </div>
  );
}
