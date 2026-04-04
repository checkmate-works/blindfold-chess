'use client';

import { useCallback, useEffect, useRef } from 'react';

import Link from 'next/link';

import { BoardOverlay, Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { getCornerInfo } from '@blindfold-chess/features/diagonal-quiz';

import { AnswerFeedback } from '@/app/[locale]/(public)/practice/_components/AnswerFeedback';
import { ScoreCounter } from '@/app/[locale]/(public)/practice/_components/ScoreCounter';
import { SectionTitle } from '@/app/[locale]/_components';
import type { Locale } from '@/app/[locale]/_lib/types';

import { ChessCoordinateKeypad } from '../../_components/ChessCoordinateKeypad';
import { DiagonalInputField } from '../../_components/DiagonalInputField';
import type { ActiveField } from '../../_hooks/use-diagonal-input';
import { useDiagonalInput } from '../../_hooks/use-diagonal-input';
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
  countdown: number | null;
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
          onNextAfterIncorrect={onNextAfterIncorrect}
          onEndTraining={onEndTraining}
        />
      </div>
    );
  }

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

      <hr className="border-border mt-8" />
      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground">{tp('trainingModeActive')}</p>
        <p className="mt-2 text-base font-medium text-foreground">{tp('readyForChallenge')}</p>
        <div className="mt-4">
          <Link href={`/${locale}/practice/diagonal-quiz/challenge`}>
            <Button asChild variant="primary" size="lg" className="w-full">
              {tp('goToChallenge')}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
