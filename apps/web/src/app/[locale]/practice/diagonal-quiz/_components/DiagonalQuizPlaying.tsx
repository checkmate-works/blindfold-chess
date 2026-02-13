'use client';

import { useCallback, useEffect, useRef } from 'react';

import { useTranslations } from 'next-intl';

import { BoardOverlay } from '@/app/_components';
import { QuizTimer } from '@/components/QuizTimer';
import { FaBackspace } from 'react-icons/fa';

import { SectionTitle } from '@/app/[locale]/_components';
import { AnswerFeedback } from '@/app/[locale]/practice/_components/AnswerFeedback';
import { ScoreCounter } from '@/app/[locale]/practice/_components/ScoreCounter';

import type { ActiveField } from './useDiagonalInput';
import { useDiagonalInput } from './useDiagonalInput';

type Props = {
  currentSquare: string;
  timeRemaining: number;
  timeLimit: number;
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
};

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8'];

/**
 * Check if a square is a corner (single-square diagonal or anti-diagonal).
 * Corner squares: a1, a8, h1, h8
 * - a1: diagonal is "a1-h8" (not single), anti-diagonal is "a1" (single)
 * - h8: diagonal is "a1-h8" (not single), anti-diagonal is "h8" (single)
 * - a8: diagonal is "a8" (single), anti-diagonal is "a8-h1" (not single)
 * - h1: diagonal is "h1" (single), anti-diagonal is "a8-h1" (not single)
 */
function getCornerInfo(square: string): {
  singleDiagonal: boolean;
  singleAntiDiagonal: boolean;
} {
  const f = square.charCodeAt(0) - 'a'.charCodeAt(0);
  const r = parseInt(square[1], 10) - 1;

  // Diagonal length: determined by f - r constant
  const diag = f - r;
  const diagStartF = diag >= 0 ? diag : 0;
  const diagStartR = diag >= 0 ? 0 : -diag;
  const diagLength = Math.min(7 - diagStartF, 7 - diagStartR);
  const singleDiagonal = diagLength === 0;

  // Anti-diagonal length: determined by f + r constant
  const antiDiag = f + r;
  const antiStartF = antiDiag <= 7 ? antiDiag : 7;
  const antiStartR = antiDiag <= 7 ? 0 : antiDiag - 7;
  const antiLength = Math.min(antiStartF, 7 - antiStartR);
  const singleAntiDiagonal = antiLength === 0;

  return { singleDiagonal, singleAntiDiagonal };
}

export function DiagonalQuizPlaying({
  currentSquare,
  timeRemaining,
  timeLimit,
  showResult,
  lastAnswer,
  onAnswer,
  countdown,
  correctCount,
  incorrectCount,
}: Props) {
  const t = useTranslations('practice.diagonalQuiz');
  const timeElapsed = timeLimit - timeRemaining;
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
    diagonalText,
    antiDiagonalText,
    activeField,
    setActiveField,
    isDiagonalComplete,
    isAntiDiagonalComplete,
    expectingFile,
    expectingRank,
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
    // Allow switching to an already-complete field to edit it
    setActiveField(field);
  };

  return (
    <div className="max-w-md mx-auto">
      {/* Header with Timer */}
      <div className="relative flex items-center justify-center min-h-[50px] mb-8">
        <div className="absolute right-0 top-1/2 -translate-y-1/2">
          <QuizTimer
            timeRemaining={timeRemaining}
            progress={timeLimit > 0 ? timeElapsed / timeLimit : 0}
            size={50}
          />
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border p-8 text-center relative overflow-hidden shadow-sm">
        {/* Countdown Overlay */}
        <BoardOverlay isVisible={countdown !== null} className="backdrop-blur-md">
          <span className="text-8xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] dark:drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] animate-in zoom-in duration-300">
            {countdown !== null && (countdown > 0 ? countdown : 'START!')}
          </span>
        </BoardOverlay>

        <SectionTitle className="mb-6">{t('question', { square: currentSquare })}</SectionTitle>

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
          {/* Diagonal field */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1 text-left">
              {t('diagonalLabel')}
              {singleDiagonal && (
                <span className="ml-1 text-xs text-muted-foreground/70">({t('singleSquare')})</span>
              )}
            </label>
            <button
              type="button"
              onClick={() => handleFieldClick('diagonal')}
              disabled={isDisabled}
              className={`w-full px-4 py-3 rounded-lg border text-center text-lg font-mono transition-colors ${
                activeField === 'diagonal' && !isDisabled
                  ? 'border-primary ring-2 ring-primary/30 bg-background text-foreground'
                  : isDiagonalComplete
                    ? 'border-border bg-muted/50 text-foreground'
                    : 'border-border bg-background text-muted-foreground'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {diagonalText || (
                <span className="text-muted-foreground/50">
                  {singleDiagonal ? t('singleSquarePlaceholder') : t('inputPlaceholder')}
                </span>
              )}
            </button>
          </div>

          {/* Anti-diagonal field */}
          <div>
            <label className="block text-sm font-medium text-muted-foreground mb-1 text-left">
              {t('antiDiagonalLabel')}
              {singleAntiDiagonal && (
                <span className="ml-1 text-xs text-muted-foreground/70">({t('singleSquare')})</span>
              )}
            </label>
            <button
              type="button"
              onClick={() => handleFieldClick('antiDiagonal')}
              disabled={isDisabled}
              className={`w-full px-4 py-3 rounded-lg border text-center text-lg font-mono transition-colors ${
                activeField === 'antiDiagonal' && !isDisabled
                  ? 'border-primary ring-2 ring-primary/30 bg-background text-foreground'
                  : isAntiDiagonalComplete
                    ? 'border-border bg-muted/50 text-foreground'
                    : 'border-border bg-background text-muted-foreground'
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {antiDiagonalText || (
                <span className="text-muted-foreground/50">
                  {singleAntiDiagonal ? t('singleSquarePlaceholder') : t('inputPlaceholder')}
                </span>
              )}
            </button>
          </div>
        </div>

        {/* Step indicator */}
        {!isDisabled && (
          <div className="text-sm text-muted-foreground mb-4">
            {expectingFile ? t('selectFile') : expectingRank ? t('selectRank') : ''}
          </div>
        )}

        {/* Button Input Area */}
        <div className="flex flex-col gap-2">
          {/* File buttons */}
          <div className="flex gap-1 justify-center w-full">
            {FILES.map((file) => (
              <button
                key={file}
                onClick={() => handleFilePress(file)}
                disabled={isDisabled || !expectingFile}
                className={`flex-1 min-w-0 h-11 rounded-md font-mono text-lg transition-colors border ${
                  expectingFile && !isDisabled
                    ? 'bg-background hover:bg-muted border-border text-foreground'
                    : 'bg-background border-border opacity-30 cursor-not-allowed text-muted-foreground'
                }`}
              >
                {file}
              </button>
            ))}
          </div>

          {/* Rank buttons */}
          <div className="flex gap-1 justify-center w-full">
            {RANKS.map((rank) => (
              <button
                key={rank}
                onClick={() => handleRankPress(rank)}
                disabled={isDisabled || !expectingRank}
                className={`flex-1 min-w-0 h-11 rounded-md font-mono text-lg transition-colors border ${
                  expectingRank && !isDisabled
                    ? 'bg-background hover:bg-muted border-border text-foreground'
                    : 'bg-background border-border opacity-30 cursor-not-allowed text-muted-foreground'
                }`}
              >
                {rank}
              </button>
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 mt-1">
            <button
              onClick={handleBackspace}
              disabled={isDisabled}
              className="flex-1 h-11 rounded-md font-mono text-lg transition-colors border border-border bg-background hover:bg-muted text-foreground flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
              title={t('backspace')}
            >
              <FaBackspace className="w-5 h-5" />
            </button>
            <button
              onClick={handleClear}
              disabled={isDisabled}
              className="flex-1 h-11 rounded-md font-mono text-lg transition-colors border border-border bg-background hover:bg-muted text-foreground flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
            >
              {t('clear')}
            </button>
          </div>
        </div>
      </div>

      <ScoreCounter correct={correctCount} incorrect={incorrectCount} className="mt-8" />
    </div>
  );
}
