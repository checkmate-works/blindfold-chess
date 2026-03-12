'use client';

import { useEffect, useState } from 'react';

import { useTranslations } from 'next-intl';

import { ChessBoard } from '@/app/_components';
import { FaEye } from 'react-icons/fa';

import { ProgressBar } from '@/app/[locale]/(public)/practice/_components/ProgressBar';
import { MoveInputPanel } from '@/app/[locale]/_components/MoveInputPanel';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import { useScrollLock } from '@/app/[locale]/_hooks/use-scroll-lock';

import { useMoveSequenceRecall } from '../_hooks/use-move-sequence-recall';
import type { MoveSequenceData, MoveSequenceSessionResult, RecallResult } from '../_lib/types';

type Props = {
  data: MoveSequenceData;
  onComplete: (result: MoveSequenceSessionResult) => void;
  onQuit: (result: MoveSequenceSessionResult) => void;
};

export function MoveSequenceRecall({ data, onComplete, onQuit }: Props) {
  const t = useTranslations('practice.moveSequence');
  const { preferences, updatePreferences } = useGamePreferences();

  const [moveInput, setMoveInput] = useState('');
  const [isBoardVisible, setIsBoardVisible] = useState(false);

  const {
    currentFen,
    error,
    setError,
    lastMove,
    results,
    completedMoves,
    formattedMoveHistory,
    totalTargetMoves,
    completedTargetMoves,
    requiresUserInput,
    isCompleted,
    isWhiteTurn,
    handleMoveSubmit,
  } = useMoveSequenceRecall(data);

  // Check if all moves are complete
  useEffect(() => {
    if (isCompleted) {
      // Calculate final results
      const correctMoves = results.filter((r: RecallResult) => r.isCorrect).length;
      onComplete({
        totalMoves: totalTargetMoves,
        correctMoves,
        accuracy: totalTargetMoves > 0 ? Math.round((correctMoves / totalTargetMoves) * 100) : 0,
        results,
      });
    }
  }, [isCompleted, results, totalTargetMoves, onComplete]);

  useScrollLock(isBoardVisible);

  // Handle board modal visibility
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsBoardVisible(false);
      }
    };

    if (isBoardVisible) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isBoardVisible]);

  // Handle move submission
  const handleSubmit = (move: string) => {
    handleMoveSubmit(
      move,
      () => setMoveInput(''),
      (errType?: string) => {
        if (errType === 'wrongMove') setError(t('wrongMove', { move }));
        else if (errType === 'invalidMove') setError(t('invalidMove'));
        setMoveInput('');
      }
    );
  };

  const flipped = data.playerColor === 'b';

  const turnLabel = data.includeOpponentMoves
    ? isWhiteTurn
      ? t('whiteTurn')
      : t('blackTurn')
    : t('yourMove');

  // If all moves are complete, show loading while transitioning
  if (isCompleted) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-card rounded-md shadow-sm border border-border p-4">
        <div className="flex flex-col gap-6">
          {/* Progress */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <ProgressBar current={completedTargetMoves} total={totalTargetMoves} />
            </div>
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {completedTargetMoves} / {totalTargetMoves}
            </span>
          </div>

          {/* Move History */}
          {completedMoves.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-2">{t('moveHistory')}</h3>
              <p className="font-mono text-sm text-foreground break-words">
                {formattedMoveHistory}
              </p>
            </div>
          )}

          {/* Move Input */}
          {requiresUserInput ? (
            <>
              <h3 className="text-sm font-medium text-muted-foreground">{turnLabel}</h3>
              <MoveInputPanel
                preferences={preferences}
                updatePreferences={updatePreferences}
                currentFen={currentFen}
                moveInput={moveInput}
                onMoveInputChange={setMoveInput}
                error={error}
                onErrorClear={() => {
                  if (error) setError(null);
                }}
                onSubmit={handleSubmit}
                disabled={false}
                toggleTitle={t('switchInputMode')}
                playerColor={data.playerColor}
              />
              <div className="flex justify-start">
                <button
                  onClick={() => setIsBoardVisible(true)}
                  className="px-4 py-2 border border-border rounded-md hover:bg-muted flex items-center gap-2"
                  title={t('showBoard')}
                >
                  <FaEye className="w-4 h-4" />
                  <span>{t('showBoard')}</span>
                </button>
              </div>
            </>
          ) : (
            <p className="text-center text-muted-foreground">{t('opponentTurn')}</p>
          )}
        </div>
      </div>

      {/* End Practice Link */}
      <div className="flex justify-center mt-4">
        <button
          onClick={() => {
            // Calculate results for completed moves so far
            const correctMoves = results.filter((r: RecallResult) => r.isCorrect).length;
            onQuit({
              totalMoves: totalTargetMoves,
              correctMoves,
              accuracy:
                totalTargetMoves > 0 ? Math.round((correctMoves / totalTargetMoves) * 100) : 0,
              results,
            });
          }}
          className="text-sm text-muted-foreground hover:text-foreground underline transition-colors"
        >
          {t('endPractice')}
        </button>
      </div>

      {/* Board View Modal */}
      {isBoardVisible && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => setIsBoardVisible(false)}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/70" />

          {/* Content */}
          <div className="relative z-10 w-full max-w-lg px-4">
            <div className="rounded-md overflow-hidden shadow-lg">
              <ChessBoard
                fen={currentFen}
                flipped={flipped}
                showCoordinates={preferences.showCoordinates}
                boardTheme={preferences.boardTheme}
                lastMove={preferences.highlightLastMove ? lastMove : null}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
