'use client';

import { useCallback, useEffect, useRef } from 'react';

import { useTranslations } from 'next-intl';

import { BoardOverlay } from '@/app/_components';
import { getCornerInfo } from '@blindfold-chess/features/diagonal-quiz';
import { FaBackspace } from 'react-icons/fa';
import { LuPause, LuPlay } from 'react-icons/lu';

import { SectionTitle } from '@/app/[locale]/_components';
import { AnswerFeedback } from '@/app/[locale]/practice/_components/AnswerFeedback';
import { QuizTimer } from '@/app/[locale]/practice/_components/QuizTimer';
import { ScoreCounter } from '@/app/[locale]/practice/_components/ScoreCounter';

import type { ActiveField } from '../../_components/useDiagonalInput';
import { useDiagonalInput } from '../../_components/useDiagonalInput';

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
  showStats?: boolean;
  isPaused?: boolean;
  onTogglePause?: () => void;
};

const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
const RANKS = ['1', '2', '3', '4', '5', '6', '7', '8'];

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
  showStats = true,
  isPaused = false,
  onTogglePause,
}: Props) {
  const t = useTranslations('practice.diagonalQuiz');
  const timeElapsed = timeLimit - timeRemaining;
  const isDisabled = showResult || countdown !== null || isPaused;

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
    // Allow switching to an already-complete field to edit it
    setActiveField(field);
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-card rounded-xl border border-border p-8 text-center relative overflow-hidden shadow-sm">
        {/* Countdown Overlay */}
        <BoardOverlay
          isVisible={countdown !== null}
          className="backdrop-blur-md z-50"
          data-testid="countdown-overlay"
        >
          <span className="text-8xl font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)] dark:drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] animate-in zoom-in duration-300">
            {countdown !== null && (countdown > 0 ? countdown : 'START!')}
          </span>
        </BoardOverlay>

        {/* Pause Overlay */}
        <BoardOverlay isVisible={isPaused} className="backdrop-blur-sm bg-black/40 z-50">
          <button
            onClick={onTogglePause}
            className="bg-white/90 hover:bg-white text-gray-900 rounded-full p-6 shadow-lg transition-all hover:scale-110 active:scale-95 pointer-events-auto"
            aria-label="Resume"
          >
            <LuPlay size={48} className="fill-current ml-1" />
          </button>
        </BoardOverlay>

        <div
          className={
            isPaused || countdown !== null
              ? 'blur-sm transition-all duration-300'
              : 'transition-all duration-300'
          }
        >
          <SectionTitle className="mb-4">{t('question', { square: currentSquare })}</SectionTitle>

          <div className="flex justify-end mb-4 min-h-[40px] relative">
            <div className="absolute right-0 top-1/2 -translate-y-1/2 flex items-center gap-2 z-20">
              {onTogglePause && (
                <button
                  onClick={onTogglePause}
                  className="p-1 rounded-full hover:bg-muted transition-colors disabled:opacity-50"
                  disabled={countdown !== null}
                  aria-label={isPaused ? 'Resume' : 'Pause'}
                >
                  {isPaused ? (
                    <LuPlay size={18} className="fill-current" />
                  ) : (
                    <LuPause size={18} className="fill-current" />
                  )}
                </button>
              )}
              <QuizTimer
                timeRemaining={timeRemaining}
                progress={timeLimit > 0 ? timeElapsed / timeLimit : 0}
                size={40}
                fontSize="text-xs"
                strokeWidth={4}
              />
            </div>
          </div>

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
                  <span className="ml-1 text-xs text-muted-foreground/70">
                    ({t('singleSquare')})
                  </span>
                )}
              </label>
              {singleDiagonal ? (
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
                  {diagonalStartText || (
                    <span className="text-muted-foreground/50">{t('singleSquarePlaceholder')}</span>
                  )}
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleFieldClick('diagonal')}
                    disabled={isDisabled}
                    className={`flex-1 px-4 py-3 rounded-lg border text-center text-lg font-mono transition-colors ${
                      activeField === 'diagonal' && !isDisabled && isInputtingStart
                        ? 'border-primary ring-2 ring-primary/30 bg-background text-foreground'
                        : diagonalStartText
                          ? 'border-border bg-muted/50 text-foreground'
                          : 'border-border bg-background text-muted-foreground'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {diagonalStartText || (
                      <span className="text-muted-foreground/50">{t('squarePlaceholder')}</span>
                    )}
                  </button>
                  <span className="text-lg font-mono text-muted-foreground">-</span>
                  <button
                    type="button"
                    onClick={() => handleFieldClick('diagonal')}
                    disabled={isDisabled}
                    className={`flex-1 px-4 py-3 rounded-lg border text-center text-lg font-mono transition-colors ${
                      activeField === 'diagonal' && !isDisabled && isInputtingEnd
                        ? 'border-primary ring-2 ring-primary/30 bg-background text-foreground'
                        : diagonalEndText
                          ? 'border-border bg-muted/50 text-foreground'
                          : 'border-border bg-background text-muted-foreground'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {diagonalEndText || (
                      <span className="text-muted-foreground/50">{t('squarePlaceholder')}</span>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Anti-diagonal field */}
            <div>
              <label className="block text-sm font-medium text-muted-foreground mb-1 text-left">
                {t('antiDiagonalLabel')}
                {singleAntiDiagonal && (
                  <span className="ml-1 text-xs text-muted-foreground/70">
                    ({t('singleSquare')})
                  </span>
                )}
              </label>
              {singleAntiDiagonal ? (
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
                  {antiDiagonalStartText || (
                    <span className="text-muted-foreground/50">{t('singleSquarePlaceholder')}</span>
                  )}
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleFieldClick('antiDiagonal')}
                    disabled={isDisabled}
                    className={`flex-1 px-4 py-3 rounded-lg border text-center text-lg font-mono transition-colors ${
                      activeField === 'antiDiagonal' && !isDisabled && isInputtingStart
                        ? 'border-primary ring-2 ring-primary/30 bg-background text-foreground'
                        : antiDiagonalStartText
                          ? 'border-border bg-muted/50 text-foreground'
                          : 'border-border bg-background text-muted-foreground'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {antiDiagonalStartText || (
                      <span className="text-muted-foreground/50">{t('squarePlaceholder')}</span>
                    )}
                  </button>
                  <span className="text-lg font-mono text-muted-foreground">-</span>
                  <button
                    type="button"
                    onClick={() => handleFieldClick('antiDiagonal')}
                    disabled={isDisabled}
                    className={`flex-1 px-4 py-3 rounded-lg border text-center text-lg font-mono transition-colors ${
                      activeField === 'antiDiagonal' && !isDisabled && isInputtingEnd
                        ? 'border-primary ring-2 ring-primary/30 bg-background text-foreground'
                        : antiDiagonalEndText
                          ? 'border-border bg-muted/50 text-foreground'
                          : 'border-border bg-background text-muted-foreground'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    {antiDiagonalEndText || (
                      <span className="text-muted-foreground/50">{t('squarePlaceholder')}</span>
                    )}
                  </button>
                </div>
              )}
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
      </div>

      {showStats && (
        <ScoreCounter correct={correctCount} incorrect={incorrectCount} className="mt-8" />
      )}
    </div>
  );
}
