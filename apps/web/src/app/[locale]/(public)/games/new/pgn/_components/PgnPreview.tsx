'use client';

import { useMemo, useState } from 'react';

import { Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { formatMovesToPgn, getLastMoveDetails } from '@blindfold-chess/features/chess-core';
import type { AlgebraicNotation, Side } from '@blindfold-chess/types';
import { FaEye } from 'react-icons/fa';

import { BoardViewModal } from '@/app/[locale]/(public)/games/play/_components/BoardViewModal';
import { useBoardFlip } from '@/app/[locale]/(public)/games/play/_hooks/use-board-flip';
import { useMoveNavigation } from '@/app/[locale]/(public)/games/play/_hooks/use-move-navigation';
import { parseFenMeta } from '@/app/[locale]/(public)/games/play/_lib/fen-utils';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

type Props = {
  pgnMoves: AlgebraicNotation[];
  startingFen?: string;
  color: Side;
};

/**
 * Renders the "Preview board" button + modal for a parsed PGN. Owns the
 * board-view modal open state and the move-navigation hook wiring.
 */
export function PgnPreview({ pgnMoves, startingFen, color }: Props) {
  const t = useTranslations('newGame');
  const { preferences } = useGamePreferences();
  const [isBoardVisible, setIsBoardVisible] = useState(false);
  const { effectiveFlipped, toggleFlip } = useBoardFlip({ playerSide: color });

  const {
    currentPosition,
    displayFen: hookDisplayFen,
    navigateToPosition,
    navigateToStart,
    navigatePrevious,
    navigateNext,
    navigateToEnd,
    latestFen,
  } = useMoveNavigation({
    moves: pgnMoves,
    startingFen,
  });

  const displayFen = hookDisplayFen || latestFen;

  // Shared formatter rather than a local pairing loop: the local one emitted
  // no `whiteMoveIndex`/`blackMoveIndex`, which is what the move list uses to
  // highlight the current move and to navigate when one is clicked — so every
  // move in this preview rendered inert. It also numbered from 1 regardless of
  // `startingFen`, mis-labelling a preview of a game set up mid-game.
  const formattedPgn = useMemo(() => {
    const { startsAsBlack, startMoveNumber } = parseFenMeta(startingFen);
    return formatMovesToPgn(pgnMoves, startsAsBlack, startMoveNumber);
  }, [pgnMoves, startingFen]);

  const lastMove = useMemo(() => {
    if (pgnMoves.length === 0) return null;
    const position = currentPosition === -1 ? pgnMoves.length - 1 : currentPosition;
    if (position < 0) return null;

    try {
      const movesUpToPosition = pgnMoves.slice(0, position + 1) as string[];
      return getLastMoveDetails(movesUpToPosition, startingFen);
    } catch {
      return null;
    }
  }, [pgnMoves, currentPosition, startingFen]);

  if (pgnMoves.length === 0 && !startingFen) return null;

  return (
    <>
      <div className="flex justify-center">
        <Button
          variant="outline"
          icon={<FaEye className="w-4 h-4" />}
          onClick={() => setIsBoardVisible(true)}
        >
          {t('previewBoard')}
        </Button>
      </div>

      <BoardViewModal
        isOpen={isBoardVisible}
        onClose={() => setIsBoardVisible(false)}
        fen={displayFen}
        playerSide={color}
        flipped={effectiveFlipped}
        lastMove={currentPosition !== -2 ? lastMove : null}
        preferences={preferences}
        movesLength={pgnMoves.length}
        currentPosition={currentPosition}
        formattedPgn={formattedPgn}
        onNavigateToStart={navigateToStart}
        onNavigatePrevious={navigatePrevious}
        onNavigateNext={navigateNext}
        onNavigateToEnd={navigateToEnd}
        onNavigateToPosition={navigateToPosition}
        onFlipBoard={toggleFlip}
      />
    </>
  );
}
