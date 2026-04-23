import { useCallback, useState } from 'react';

import type { BoardOrientation } from '@blindfold-chess/types';

import {
  DEFAULT_PIECE_SELECTION,
  PIECE_SHORT_TO_NAME,
  type PieceSelection,
} from '../_lib/derive-piece-filter';
import type { DatePeriod } from '../_lib/period-utils';

export type { BoardOrientation };

/**
 * Owns the user-facing UI filter state for the mypage challenges dashboard:
 * period bucket, board-orientation radio (coordinate_quiz), and piece
 * selection (legal_moves). Fetching and session data live elsewhere.
 */
export function useDashboardFilters() {
  const [selectedPeriod, setSelectedPeriod] = useState<DatePeriod>('thisWeek');
  const [boardOrientationFilter, setBoardOrientationFilter] = useState<BoardOrientation>('white');
  const [pieceFilter, setPieceFilter] = useState<PieceSelection>(DEFAULT_PIECE_SELECTION);

  const handlePieceSelect = useCallback((piece: PieceSelection) => {
    setPieceFilter(piece);
  }, []);

  const resetFilters = useCallback(() => {
    setBoardOrientationFilter('white');
    setPieceFilter(DEFAULT_PIECE_SELECTION);
  }, []);

  const activePiece =
    pieceFilter === 'random'
      ? 'random'
      : (PIECE_SHORT_TO_NAME[pieceFilter as keyof typeof PIECE_SHORT_TO_NAME] ?? 'random');

  return {
    selectedPeriod,
    setSelectedPeriod,
    boardOrientationFilter,
    setBoardOrientationFilter,
    pieceFilter,
    setPieceFilter,
    handlePieceSelect,
    resetFilters,
    activePiece,
  };
}
