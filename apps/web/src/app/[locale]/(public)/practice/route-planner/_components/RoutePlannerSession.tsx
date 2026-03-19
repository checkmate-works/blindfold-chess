'use client';

import { useCallback, useState } from 'react';

import { useTranslations } from 'next-intl';

import { Button } from '@/app/_components';
import { ChessPiece } from '@/app/_components/chess/ChessPiece';
import { FaArrowRight, FaFlagCheckered, FaUndo } from 'react-icons/fa';

import { PieceCoordinateInput } from '@/app/[locale]/(public)/practice/_components/PieceCoordinateInput';
import { ProgressBar } from '@/app/[locale]/(public)/practice/_components/ProgressBar';
import { QuitConfirmModal } from '@/app/[locale]/(public)/practice/_components/QuitConfirmModal';
import { ScoreCounter } from '@/app/[locale]/(public)/practice/_components/ScoreCounter';
import { useQuitConfirmLabels } from '@/app/[locale]/(public)/practice/_hooks/use-quit-confirm-labels';

import { PracticeResultSkeleton } from '../../_components/PracticeResultSkeleton';
import { useCoordinateInput } from '../_hooks/use-coordinate-input';
import { useRoutePlannerGame } from '../_hooks/use-route-planner-game';
import { PIECES, type PieceType } from '../_lib/utils';
import { RoutePlannerResultView } from './RoutePlannerResultView';

type Props = {
  locale: string;
  problemCount?: number;
  allowedPieces?: PieceType[];
  mode?: 'standard' | 'tutorial' | 'training';
  initialProblem?: {
    piece: PieceType;
    start: string;
    end: string;
  };
};

export function RoutePlannerSession({
  locale,
  problemCount = 5,
  allowedPieces = [...PIECES],
  mode = 'standard',
  initialProblem,
}: Props) {
  const t = useTranslations('practice.routePlanner');
  const tPractice = useTranslations('practice');
  const quitConfirmLabels = useQuitConfirmLabels();

  const [showQuitModal, setShowQuitModal] = useState(false);

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
    currentProblemIndex,
    results,
    problem,
    moves,
    result,
    isTraining,
    addMove,
    handleUndo,
    handleSubmitAnswer,
    handleSkip,
    handleNextProblem,
    handleEndTraining,
    confirmQuit: gameConfirmQuit,
  } = useRoutePlannerGame({
    locale,
    problemCount,
    allowedPieces,
    mode,
    initialProblem,
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

  const handleQuit = useCallback(() => {
    setShowQuitModal(true);
  }, []);

  const confirmQuit = useCallback(() => {
    setShowQuitModal(false);
    gameConfirmQuit();
  }, [gameConfirmQuit]);

  if (!problem) return <PracticeResultSkeleton />;

  return (
    <div className="min-h-screen max-w-2xl mx-auto space-y-4">
      <div
        id="route-planner-session"
        className="bg-card border border-border rounded-lg p-6 space-y-6"
      >
        {!isTraining && problemCount > 1 && (
          <ProgressBar current={currentProblemIndex + 1} total={problemCount} />
        )}

        {isTraining && (
          <ScoreCounter
            correct={results.filter((r) => r.success).length}
            incorrect={results.filter((r) => !r.success).length}
          />
        )}

        <div className="flex justify-between items-center border-b border-border pb-4">
          <div className="flex items-center gap-6">
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
            isTraining={isTraining}
            isLastProblem={currentProblemIndex >= problemCount - 1}
          />
        )}
      </div>

      {/* Quit / End Training section outside the card */}
      <div className="flex flex-col items-center gap-2">
        {gameState === 'playing' && (
          <button
            onClick={handleSkip}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors underline"
          >
            {t('skip')}
          </button>
        )}
        {isTraining ? (
          <button
            onClick={handleEndTraining}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors underline"
          >
            {tPractice('endTraining')}
          </button>
        ) : (
          <button
            onClick={handleQuit}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors underline"
          >
            {t('quit')}
          </button>
        )}
      </div>

      {!isTraining && (
        <QuitConfirmModal
          isOpen={showQuitModal}
          onConfirm={confirmQuit}
          onCancel={() => setShowQuitModal(false)}
          labels={quitConfirmLabels}
        />
      )}
    </div>
  );
}
