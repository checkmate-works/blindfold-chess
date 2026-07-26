'use client';

import { type ReactNode, useEffect } from 'react';

import { ChessBoard, FlipBoardButton } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import type { Side } from '@blindfold-chess/types';

import type { EvaluationMark } from '@/lib/games/evaluation';

import type { FormattedPgnMove } from '@/app/[locale]/(public)/games/play/_lib/pgn-parser';
import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import { useScrollLock } from '@/app/[locale]/_hooks/use-scroll-lock';

import { HorizontalMoveList } from './HorizontalMoveList';
import { MOVE_NAV_ROW_CLASS, MoveNavigationControls } from './MoveNavigationControls';

type Props = {
  isOpen: boolean;
  onClose: () => void;
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
  useScrollLock(isOpen);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" />

      {/* Content. Full-bleed + square corners on mobile (matches the inline
          board and coordinate-quiz); bounded + rounded card at >=sm. */}
      <div className="relative z-10 w-full max-w-lg px-0 sm:px-4">
        <div className="rounded-none sm:rounded-md overflow-hidden">
          {/* Horizontal Move List */}
          {formattedPgn.length > 0 && onNavigateToPosition && (
            <div
              className="bg-card px-2 py-1.5 overflow-x-auto"
              onClick={(e) => e.stopPropagation()}
            >
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
            lastMove={lastMove}
            showCoordinates={preferences.showCoordinates}
            showOwnPieces={preferences.showOwnPieces}
            showOpponentPieces={preferences.showOpponentPieces}
            pieceShapeMode={preferences.pieceShapeMode}
            pieceColors={preferences.pieceColors}
            pawnHideMode={preferences.pawnHideMode}
            hiddenPieceStyle={hiddenPieceStyle}
            boardTheme={preferences.boardTheme}
            rounded={false}
            evaluationMark={evaluationMark}
          />

          {/* Navigation Controls & Flip Button */}
          {(movesLength > 0 || onFlipBoard) && (
            <div
              className={`bg-card flex items-center justify-center relative pr-11 sm:pr-0 ${MOVE_NAV_ROW_CLASS}`}
              onClick={(e) => e.stopPropagation()}
            >
              {movesLength > 0 &&
                onNavigateToStart &&
                onNavigatePrevious &&
                onNavigateNext &&
                onNavigateToEnd && (
                  <MoveNavigationControls
                    onNavigateToStart={onNavigateToStart}
                    onNavigatePrevious={onNavigatePrevious}
                    onNavigateNext={onNavigateNext}
                    onNavigateToEnd={onNavigateToEnd}
                    isPreviousDisabled={
                      currentPosition === -2 || (currentPosition === -1 && movesLength === 0)
                    }
                    isNextDisabled={
                      currentPosition === -1 ||
                      (movesLength > 0 && currentPosition === movesLength - 1)
                    }
                  />
                )}
              {onFlipBoard && (
                <FlipBoardButton
                  onClick={onFlipBoard}
                  title={t('flipBoard')}
                  className="absolute right-3 p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                />
              )}
            </div>
          )}

          {/* Optional CTA bar (e.g. shared replay's "open this position" link).
              Stop propagation so a tap here doesn't fall through to the backdrop
              close handler. */}
          {footer && (
            <div
              className="bg-card border-t border-border px-3 py-2"
              onClick={(e) => e.stopPropagation()}
            >
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
