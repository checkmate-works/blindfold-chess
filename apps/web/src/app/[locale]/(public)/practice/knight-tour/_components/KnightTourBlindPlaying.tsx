'use client';

import { useCallback, useState } from 'react';

import { useTranslations } from 'next-intl';

import { Button } from '@/app/_components';

import { PieceCoordinateInput } from '@/app/[locale]/(public)/practice/_components/PieceCoordinateInput';

import { KnightTourPlayingLayout } from './KnightTourPlayingLayout';

type Props = {
  currentSquare: string;
  visitedSquares: Map<string, number>;
  availableMoves: string[];
  moveCount: number;
  onSquareClick: (square: string) => void;
  onUndo: () => void;
  onQuit: () => void;
  canUndo: boolean;
};

export function KnightTourBlindPlaying({
  currentSquare,
  visitedSquares,
  availableMoves,
  moveCount,
  onSquareClick,
  onUndo,
  onQuit,
  canUndo,
}: Props) {
  const t = useTranslations('practice.knightTour');
  const tPlay = useTranslations('play');
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedRank, setSelectedRank] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const resetInput = useCallback(() => {
    setSelectedFile(null);
    setSelectedRank(null);
  }, []);

  const handleSubmit = useCallback(
    (square: string) => {
      setError(null);

      // Check if already visited
      if (visitedSquares.has(square)) {
        setError(t('alreadyVisited'));
        resetInput();
        return;
      }

      // Check if it's a legal knight move
      if (!availableMoves.includes(square)) {
        setError(tPlay('invalidMove'));
        resetInput();
        return;
      }

      // Valid move
      onSquareClick(square);
      resetInput();
    },
    [visitedSquares, availableMoves, t, tPlay, onSquareClick, resetInput]
  );

  const attemptMoveSubmit = useCallback(
    (file: string | null, rank: string | null) => {
      if (!file || !rank) return;
      const square = `${file}${rank}`;
      handleSubmit(square);
    },
    [handleSubmit]
  );

  const handleFileToggle = useCallback(
    (file: string) => {
      setError(null);
      const newFile = file === selectedFile ? null : file;
      setSelectedFile(newFile);
    },
    [selectedFile]
  );

  const handleRankToggle = useCallback(
    (rank: string) => {
      setError(null);
      const newRank = rank === selectedRank ? null : rank;
      setSelectedRank(newRank);
    },
    [selectedRank]
  );

  return (
    <KnightTourPlayingLayout
      currentSquare={currentSquare}
      visitedSquares={visitedSquares}
      availableMoves={availableMoves}
      moveCount={moveCount}
      onUndo={onUndo}
      onQuit={onQuit}
      canUndo={canUndo}
      positionTextSize="text-5xl"
    >
      <PieceCoordinateInput
        activePiece="n"
        selectedFile={selectedFile}
        selectedRank={selectedRank}
        onFileToggle={handleFileToggle}
        onRankToggle={handleRankToggle}
      >
        {/* Submit Button */}
        <div className="flex pt-4 border-t border-border mt-2">
          <Button
            onClick={() => attemptMoveSubmit(selectedFile, selectedRank)}
            disabled={!selectedFile || !selectedRank}
            variant="primary"
            className="w-full"
          >
            {t('submitMove')}
          </Button>
        </div>

        {error && <p className="text-destructive text-sm">{error}</p>}
      </PieceCoordinateInput>
    </KnightTourPlayingLayout>
  );
}
