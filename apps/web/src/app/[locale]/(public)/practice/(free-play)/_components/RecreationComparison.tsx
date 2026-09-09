'use client';

import { useMemo } from 'react';

import { BoardFrame } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { calculateSquareDifferences } from '@blindfold-chess/features/common';

import type { BoardTheme } from '@/lib/games/board-themes';

import { AnimatedChessBoard } from '@/app/[locale]/(public)/practice/_components/AnimatedChessBoard';
import type { PositionData } from '@/app/[locale]/(public)/practice/_lib/types';

import { ChessBoardWithOverlay } from './ChessBoardWithOverlay';

type Props = {
  /**
   * Namespace holding `original` and `yourRecreation`. The keys are spelled
   * the same under every position-recreation module, so the namespace is all
   * a caller has to supply.
   */
  namespace: string;
  originalPosition: PositionData;
  /** FEN the player rebuilt; each square's verdict is drawn over it. */
  recreatedPosition: string;
  boardTheme: BoardTheme;
  /** Applied to both boards, as the reader's coordinate preference is elsewhere. */
  showCoordinates: boolean;
};

/**
 * The side-by-side "original / your recreation" boards of a position-recall
 * result, with the recreation overlaid by which squares matched.
 */
export function RecreationComparison({
  namespace,
  originalPosition,
  recreatedPosition,
  boardTheme,
  showCoordinates,
}: Props) {
  const t = useTranslations(namespace);

  const squareDifferences = useMemo(
    () => calculateSquareDifferences(originalPosition.fen, recreatedPosition),
    [originalPosition.fen, recreatedPosition]
  );

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-2">{t('original')}</p>
        <BoardFrame>
          <AnimatedChessBoard
            initialFen={originalPosition.fen}
            showCoordinates={showCoordinates}
            flipped={originalPosition.isBlackToMove}
            boardTheme={boardTheme}
          />
        </BoardFrame>
      </div>
      <div>
        <p className="text-sm font-medium text-muted-foreground mb-2">{t('yourRecreation')}</p>
        <BoardFrame>
          <ChessBoardWithOverlay
            fen={recreatedPosition}
            flipped={originalPosition.isBlackToMove}
            squareDifferences={squareDifferences}
            boardTheme={boardTheme}
            showCoordinates={showCoordinates}
          />
        </BoardFrame>
      </div>
    </div>
  );
}
