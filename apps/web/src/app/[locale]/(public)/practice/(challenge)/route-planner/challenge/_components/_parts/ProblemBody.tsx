'use client';

import { useCallback, useState } from 'react';

import { isValidSquare } from '@blindfold-chess/features/common';
import type { Square } from '@blindfold-chess/types';

import { useAlgebraicKeyboardInput } from '@/app/[locale]/(public)/practice/_hooks/use-algebraic-keyboard-input';

import { useStagedCoordinate } from '../../../_hooks/use-staged-coordinate';
import type { PieceType } from '../../../_lib/pieces';
import { findShortestPath, validateUserPath } from '../../../_lib/route-planner-api';
import { MovesHistory } from './MovesHistory';
import { SubmitArea } from './SubmitArea';

export type ProblemResult = {
  piece: PieceType;
  start: Square;
  end: Square;
  success: boolean;
  userPath: Square[];
  shortestPath: Square[];
};

type Props = {
  currentProblem: { piece: PieceType; start: Square; end: Square };
  isDisabled: boolean;
  showFeedback: boolean;
  isPaused: boolean;
  countdown: number | null;
  onAnswer: (success: boolean) => void;
  onRecordResult: (result: ProblemResult) => void;
};

/**
 * Per-problem view. Mounted with a problem-identity `key` by the parent, so
 * React automatically discards local state (moves, staged coord, feedback
 * marker) when a new problem arrives — replacing the previous
 * `prevProblemRef` useEffect reset pattern.
 */
export function ProblemBody({
  currentProblem,
  isDisabled,
  showFeedback,
  isPaused,
  countdown,
  onAnswer,
  onRecordResult,
}: Props) {
  const [moves, setMoves] = useState<Square[]>([]);
  const [lastAnswerCorrect, setLastAnswerCorrect] = useState<boolean | null>(null);

  const staged = useStagedCoordinate({ disabled: isDisabled });

  const addMove = useCallback((square: string) => {
    // Keypad input arrives as a raw string; this is the parse boundary.
    if (!isValidSquare(square)) return;
    setMoves((prev) => [...prev, square]);
  }, []);

  const handleUndo = useCallback(() => {
    setMoves((prev) => (prev.length === 0 ? prev : prev.slice(0, -1)));
    staged.resetStage();
  }, [staged]);

  const handleFilePress = useCallback(
    (file: string) => {
      const next = staged.pressFile(file);
      if (next.selectedFile !== null && next.selectedRank !== null) {
        addMove(`${next.selectedFile}${next.selectedRank}`);
        staged.resetStage();
      }
    },
    [staged, addMove]
  );

  const handleRankPress = useCallback(
    (rank: string) => {
      const next = staged.pressRank(rank);
      if (next.selectedFile !== null && next.selectedRank !== null) {
        addMove(`${next.selectedFile}${next.selectedRank}`);
        staged.resetStage();
      }
    },
    [staged, addMove]
  );

  const handleBackspace = useCallback(() => {
    if (staged.clearStage()) return;
    if (moves.length > 0) handleUndo();
  }, [staged, moves.length, handleUndo]);

  useAlgebraicKeyboardInput({
    onFile: handleFilePress,
    onRank: handleRankPress,
    onBackspace: handleBackspace,
    enabled: !isDisabled,
  });

  const handleSubmitAnswer = useCallback(() => {
    if (showFeedback || isPaused || countdown !== null) return;

    const finalMoves = [...moves];
    if (finalMoves.length > 0 && finalMoves[finalMoves.length - 1] !== currentProblem.end) {
      finalMoves.push(currentProblem.end);
    } else if (finalMoves.length === 0) {
      finalMoves.push(currentProblem.end);
    }

    const validation = validateUserPath(
      currentProblem.piece,
      currentProblem.start,
      finalMoves,
      currentProblem.end
    );
    const shortestPath =
      findShortestPath(currentProblem.piece, currentProblem.start, currentProblem.end) || [];

    const success = validation.valid;

    setMoves(finalMoves);
    setLastAnswerCorrect(success);

    onRecordResult({
      piece: currentProblem.piece,
      start: currentProblem.start,
      end: currentProblem.end,
      success,
      userPath: finalMoves,
      shortestPath,
    });

    onAnswer(success);
  }, [currentProblem, moves, showFeedback, isPaused, countdown, onAnswer, onRecordResult]);

  // While the hook is not in feedback mode, suppress the stale marker.
  const effectiveLastAnswer = showFeedback ? lastAnswerCorrect : null;

  return (
    <div className="space-y-4">
      <MovesHistory
        start={currentProblem.start}
        end={currentProblem.end}
        moves={moves}
        showFeedback={showFeedback}
        lastAnswerCorrect={effectiveLastAnswer}
        onUndo={handleUndo}
      />
      <SubmitArea
        piece={currentProblem.piece}
        start={currentProblem.start}
        end={currentProblem.end}
        selectedFile={staged.selectedFile}
        selectedRank={staged.selectedRank}
        onFilePress={handleFilePress}
        onRankPress={handleRankPress}
        onSubmit={handleSubmitAnswer}
        isDisabled={isDisabled}
        movesCount={moves.length}
      />
    </div>
  );
}
