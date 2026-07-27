'use client';

import type { ReactNode } from 'react';

import { ChessBoard } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import type { Side } from '@blindfold-chess/types';

import type { EvaluationMark } from '@/lib/games/evaluation';

import type { FormattedPgnMove } from '@/app/[locale]/(public)/games/play/_lib/pgn-parser';
import { BoardModal } from '@/app/[locale]/_components/BoardModal';
import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import { resolveBoardDisplay } from '@/app/[locale]/_hooks/use-board-display';

import { HorizontalMoveList } from './HorizontalMoveList';
import { MoveNavigationRow } from './MoveNavigationRow';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  /** Header text. Defaults to the generic "Board" — pass something specific
   * when the surface knows what the board is (a preview, a recalled game …). */
  title?: string;
  fen: string;
  playerSide: Side;
  flipped?: boolean;
  lastMove: { from: string; to: string } | null;
  preferences: GamePreferences;
  /** Relayed to the inner `ChessBoard`; `'ghost'` in the review's reproduce view. */
  hiddenPieceStyle?: 'absent' | 'ghost';
  movesLength: number;
  currentPosition: number;
  formattedPgn: FormattedPgnMove[];
  evaluationMark?: EvaluationMark | null;
  onNavigateToStart?: () => void;
  onNavigatePrevious?: () => void;
  onNavigateNext?: () => void;
  onNavigateToEnd?: () => void;
  onNavigateToPosition?: (position: number) => void;
  onFlipBoard?: () => void;
  /**
   * Optional CTA rendered in a footer bar below the navigation controls. Used by
   * the shared replay to offer a "open this position in the full view (with
   * comments)" link out of the quick-peek modal; the result page omits it (its
   * modal is the terminal detail — there is no richer per-position screen).
   */
  footer?: ReactNode;
};

export function BoardViewModal({
  isOpen,
  onClose,
  title,
  fen,
  playerSide,
  flipped,
  lastMove,
  preferences,
  hiddenPieceStyle = 'absent',
  movesLength,
  currentPosition,
  formattedPgn,
  evaluationMark,
  onNavigateToStart,
  onNavigatePrevious,
  onNavigateNext,
  onNavigateToEnd,
  onNavigateToPosition,
  onFlipBoard,
  footer,
}: Props) {
  const t = useTranslations('play');

  return (
    <BoardModal isOpen={isOpen} title={title ?? t('boardModalTitle')} onClose={onClose}>
      <>
        {/* Horizontal Move List */}
        {formattedPgn.length > 0 && onNavigateToPosition && (
          <div className="bg-card px-2 py-1.5 overflow-x-auto">
            <HorizontalMoveList
              formattedPgn={formattedPgn}
              currentPosition={currentPosition}
              onNavigateToPosition={onNavigateToPosition}
            />
          </div>
        )}

        <ChessBoard
          fen={fen}
          flipped={flipped ?? playerSide === 'black'}
          playerSide={playerSide}
          showOwnPieces={preferences.showOwnPieces}
          showOpponentPieces={preferences.showOpponentPieces}
          pieceShapeMode={preferences.pieceShapeMode}
          pieceColors={preferences.pieceColors}
          pawnHideMode={preferences.pawnHideMode}
          hiddenPieceStyle={hiddenPieceStyle}
          {...resolveBoardDisplay(preferences, lastMove)}
          rounded={false}
          evaluationMark={evaluationMark}
        />

        {/* Navigation Controls & Flip Button */}
        {(movesLength > 0 || onFlipBoard) && (
          <MoveNavigationRow
            className="bg-card"
            onNavigateToStart={movesLength > 0 ? onNavigateToStart : undefined}
            onNavigatePrevious={movesLength > 0 ? onNavigatePrevious : undefined}
            onNavigateNext={movesLength > 0 ? onNavigateNext : undefined}
            onNavigateToEnd={movesLength > 0 ? onNavigateToEnd : undefined}
            isPreviousDisabled={
              currentPosition === -2 || (currentPosition === -1 && movesLength === 0)
            }
            isNextDisabled={
              currentPosition === -1 || (movesLength > 0 && currentPosition === movesLength - 1)
            }
            flip={onFlipBoard ? { onClick: onFlipBoard, label: t('flipBoard') } : undefined}
          />
        )}

        {/* Optional CTA bar (e.g. shared replay's "open this position" link). */}
        {footer && <div className="bg-card border-t border-border px-3 py-2">{footer}</div>}
      </>
    </BoardModal>
  );
}
