'use client';

import { useCallback } from 'react';

import Link from 'next/link';

import { Button } from '@/app/_components';
import { ChessPiece } from '@/app/_components/chess/ChessPiece';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaArrowRight, FaFlagCheckered, FaUndo } from 'react-icons/fa';

import { ScoreCounter } from '@/app/[locale]/(public)/practice/(challenge)/_components/ScoreCounter';
import { PieceCoordinateInput } from '@/app/[locale]/(public)/practice/_components/PieceCoordinateInput';
import { PracticeResultSkeleton } from '@/app/[locale]/(public)/practice/_components/PracticeResultSkeleton';

import { useCoordinateInput } from '../_hooks/use-coordinate-input';
import { useRoutePlannerGame } from '../_hooks/use-route-planner-game';
import { PIECES } from '../_lib/utils';
import type { PieceType } from '../_lib/utils';
import { RoutePlannerResultView } from './RoutePlannerResultView';

type Props = {
  locale: string;
  allowedPieces?: PieceType[];
  mode?: 'training';
};

export function RoutePlannerSession({
  locale,
  allowedPieces = [...PIECES],
  mode = 'training',
}: Props) {
  const t = useTranslations('practice.routePlanner');
  const tPractice = useTranslations('practice');

  const {
    selectedFile,
    selectedRank,
    highlightedPathIndex,
    setHoveredPathIndex,
    setLockedPathIndex,
    setSelectedFile,
    setSelectedRank,
    resetInput,
  } = useCoordinateInput();

  const {
    gameState,
    results,
    problem,
    moves,
    result,
    addMove,
    handleUndo,
    handleSubmitAnswer,
    handleSkip,
    handleNextProblem,
    handleEndTraining,
  } = useRoutePlannerGame({
    locale,
    allowedPieces,
    mode,
    resetInput,
  });

  const attemptMoveSubmit = useCallback(
    (file: string | null, rank: string | null) => {
      if (!file || !rank) return;
      addMove(`${file}${rank}`);
      resetInput();
    },
    [addMove, resetInput]
  );

  const handleFileToggle = useCallback(
    (file: string) => {
      const newFile = file === selectedFile ? null : file;
      setSelectedFile(newFile);
      if (newFile && selectedRank) {
        attemptMoveSubmit(newFile, selectedRank);
      }
    },
    [selectedFile, selectedRank, attemptMoveSubmit, setSelectedFile]
  );

  const handleRankToggle = useCallback(
    (rank: string) => {
      const newRank = rank === selectedRank ? null : rank;
      setSelectedRank(newRank);
      if (selectedFile && newRank) {
        attemptMoveSubmit(selectedFile, newRank);
      }
    },
    [selectedFile, selectedRank, attemptMoveSubmit, setSelectedRank]
  );

  if (!problem) return <PracticeResultSkeleton />;

  return (
    <div className="min-h-screen max-w-md mx-auto">
      <div
        id="route-planner-session"
        className="bg-card border border-border rounded-xl p-8 text-center relative overflow-hidden shadow-sm"
      >
        {/* Problem Header */}
        <div className="flex justify-center items-center gap-6 border-b border-border pb-4 mb-4">
          <div className="bg-primary/10 p-2 rounded-lg text-primary w-14 h-14 flex items-center justify-center border border-primary/20">
            <ChessPiece type={problem.piece} color="w" size={32} />
          </div>
          <div className="flex items-center gap-4">
            <div>
              <div className="text-sm text-muted-foreground">{t('startSquare')}</div>
              <div className="text-xl font-mono font-bold">{problem.start}</div>
            </div>
            <div className="text-muted-foreground pt-4">
              <FaArrowRight />
            </div>
            <div>
              <div className="text-sm text-muted-foreground">{t('targetSquare')}</div>
              <div className="text-xl font-mono font-bold">{problem.end}</div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {/* Moves History with Undo */}
          {gameState === 'playing' && (
            <div className="flex flex-wrap gap-2 items-center min-h-[3rem] p-4 bg-muted/50 rounded-md">
              <span className="font-mono font-bold text-muted-foreground">{problem.start}</span>
              {moves.map((move, i) => (
                <div key={i} className="flex items-center">
                  <span className="text-muted-foreground mx-1">&rarr;</span>
                  <span className="font-mono font-bold bg-background px-2 py-1 rounded border border-border shadow-sm">
                    {move}
                  </span>
                </div>
              ))}

              {/* Undo Button placed right next to moves */}
              {moves.length > 0 && (
                <button
                  onClick={handleUndo}
                  className="ml-2 w-8 h-8 flex items-center justify-center rounded-full bg-background hover:bg-muted border border-border text-muted-foreground hover:text-foreground transition-colors"
                  title={tPractice('undo')}
                >
                  <FaUndo size={12} />
                </button>
              )}

              <div className="flex items-center ml-2">
                <span className="text-muted-foreground mx-1">&rarr;</span>
                <span className="font-mono font-bold text-muted-foreground border border-dashed border-border px-2 py-1 rounded opacity-70">
                  {problem.end}
                </span>
              </div>
            </div>
          )}

          {gameState === 'playing' && (
            <PieceCoordinateInput
              activePiece={problem.piece}
              selectedFile={selectedFile}
              selectedRank={selectedRank}
              onFileToggle={handleFileToggle}
              onRankToggle={handleRankToggle}
            >
              {/* Answer Action */}
              <div className="flex pt-4 border-t border-border mt-2">
                <Button
                  onClick={handleSubmitAnswer}
                  disabled={moves.length === 0 && problem.start === problem.end}
                  variant="primary"
                  className="w-full"
                >
                  <FaFlagCheckered className="mr-2" />
                  {t('submit')}
                </Button>
              </div>
            </PieceCoordinateInput>
          )}
        </div>

        {gameState === 'result' && result && (
          <RoutePlannerResultView
            problem={problem}
            result={result}
            moves={moves}
            highlightedPathIndex={highlightedPathIndex}
            onHoverPathIndex={setHoveredPathIndex}
            onLockPathIndex={setLockedPathIndex}
            onNextProblem={handleNextProblem}
            isTraining={true}
            isLastProblem={false}
          />
        )}
      </div>

      <ScoreCounter
        correct={results.filter((r) => r.success).length}
        incorrect={results.filter((r) => !r.success).length}
        className="mt-8"
      />

      {/* Skip / End Training section outside the card */}
      <div className="mt-6 text-center space-y-2">
        {gameState === 'playing' && (
          <div>
            <button
              onClick={handleSkip}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {tPractice('skip')}
            </button>
          </div>
        )}
        <div>
          <button
            onClick={handleEndTraining}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {tPractice('endTraining')}
          </button>
        </div>
      </div>

      {/* Challenge link */}
      <hr className="border-border mt-8" />
      <div className="mt-6 text-center">
        <p className="text-sm text-muted-foreground">{tPractice('trainingModeActive')}</p>
        <p className="mt-2 text-base font-medium text-foreground">
          {tPractice('readyForChallenge')}
        </p>
        <div className="mt-4">
          <Link href={`/${locale}/practice/route-planner/challenge`}>
            <Button asChild variant="primary" size="lg" className="w-full">
              {tPractice('goToChallenge')}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
