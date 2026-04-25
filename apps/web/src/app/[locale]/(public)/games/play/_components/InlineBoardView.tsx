'use client';

import { useState } from 'react';

import { ChessBoard } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import type { Side } from '@blindfold-chess/types';
import { FaChevronDown, FaExchangeAlt, FaEye } from 'react-icons/fa';

import type { FormattedPgnMove } from '@/app/[locale]/(public)/games/play/_lib/pgn-parser';
import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { HorizontalMoveList } from './HorizontalMoveList';
import { MoveNavigationControls } from './MoveNavigationControls';

type Props = {
  fen: string;
  playerSide: Side;
  flipped?: boolean;
  lastMove: { from: string; to: string } | null;
  preferences: GamePreferences;
  movesLength: number;
  currentPosition: number;
  formattedPgn: FormattedPgnMove[];
  onNavigateToStart?: () => void;
  onNavigatePrevious?: () => void;
  onNavigateNext?: () => void;
  onNavigateToEnd?: () => void;
  onNavigateToPosition?: (position: number) => void;
  onFlipBoard?: () => void;
  onPeek?: () => void;
};

export function InlineBoardView({
  fen,
  playerSide,
  flipped,
  lastMove,
  preferences,
  movesLength,
  currentPosition,
  formattedPgn,
  onNavigateToStart,
  onNavigatePrevious,
  onNavigateNext,
  onNavigateToEnd,
  onNavigateToPosition,
  onFlipBoard,
  onPeek,
}: Props) {
  const t = useTranslations('play');
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-card rounded-md border border-border overflow-hidden">
      <button
        type="button"
        onClick={() => {
          if (!isOpen) onPeek?.();
          setIsOpen(!isOpen);
        }}
        className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-muted transition-colors"
      >
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <FaEye className="w-4 h-4" />
          <span>{t('showBoard')}</span>
        </div>
        <FaChevronDown
          className={`w-3 h-3 text-muted-foreground transition-transform ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>
      {isOpen && (
        <div>
          {/* Horizontal Move List */}
          {formattedPgn.length > 0 && onNavigateToPosition && (
            <div className="px-2 py-1.5 overflow-x-auto border-t border-border">
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
            boardTheme={preferences.boardTheme}
            rounded={false}
          />

          {/* Navigation Controls & Flip Button */}
          {(movesLength > 0 || onFlipBoard) && (
            <div
              className="flex items-center justify-center relative"
              style={{ aspectRatio: '8/1' }}
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
                <button
                  type="button"
                  onClick={onFlipBoard}
                  className="absolute right-3 p-1.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                  title={t('flipBoard')}
                >
                  <FaExchangeAlt className="w-3 h-3 rotate-90" />
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
