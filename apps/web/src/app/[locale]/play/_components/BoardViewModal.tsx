'use client';

import { useEffect } from 'react';

import { ChessBoard } from '@/app/_components';
import type { Side } from '@blindfold-chess/types';

import type { EvaluationMark } from '@/lib/evaluation';

import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type { FormattedPgnMove } from '@/app/[locale]/play/_lib/pgn-parser';

import { MoveNavigationControls } from './MoveNavigationControls';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  fen: string;
  playerSide: Side;
  lastMove: { from: string; to: string } | null;
  preferences: GamePreferences;
  movesLength: number;
  currentPosition: number;
  formattedPgn: FormattedPgnMove[];
  evaluationMark?: EvaluationMark | null;
  onNavigateToStart: () => void;
  onNavigatePrevious: () => void;
  onNavigateNext: () => void;
  onNavigateToEnd: () => void;
  onNavigateToPosition: (position: number) => void;
};

export function BoardViewModal({
  isOpen,
  onClose,
  fen,
  playerSide,
  lastMove,
  preferences,
  movesLength,
  currentPosition,
  formattedPgn,
  evaluationMark,
  onNavigateToStart,
  onNavigatePrevious,
  onNavigateNext,
  onNavigateToEnd,
  onNavigateToPosition,
}: Props) {
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'auto';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70" />

      {/* Content */}
      <div className="relative z-10 w-full max-w-lg px-4">
        <div className="rounded-md overflow-hidden shadow-lg">
          {/* Horizontal Move List */}
          {formattedPgn.length > 0 && (
            <div
              className="bg-card px-2 py-1.5 overflow-x-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-1 text-sm whitespace-nowrap">
                {formattedPgn.map((move) => {
                  const whiteIndex = move.whiteMoveIndex;
                  const blackIndex = move.blackMoveIndex;
                  const isWhiteHighlighted =
                    whiteIndex !== undefined && currentPosition === whiteIndex;
                  const isBlackHighlighted =
                    blackIndex !== undefined && currentPosition === blackIndex;

                  return (
                    <div key={move.moveNumber} className="flex items-center gap-0.5">
                      <span className="text-muted-foreground text-xs">{move.moveNumber}.</span>
                      {move.whiteMove ? (
                        <button
                          type="button"
                          className={`px-1.5 py-0.5 rounded transition-colors ${
                            isWhiteHighlighted
                              ? 'bg-foreground/15 font-semibold'
                              : 'hover:bg-muted/40'
                          }`}
                          onClick={() =>
                            whiteIndex !== undefined && onNavigateToPosition(whiteIndex)
                          }
                        >
                          {move.whiteMove}
                        </button>
                      ) : (
                        <span className="px-1.5 py-0.5 text-muted-foreground">..</span>
                      )}
                      {move.blackMove && (
                        <button
                          type="button"
                          className={`px-1.5 py-0.5 rounded transition-colors ${
                            isBlackHighlighted
                              ? 'bg-foreground/15 font-semibold'
                              : 'hover:bg-muted/40'
                          }`}
                          onClick={() =>
                            blackIndex !== undefined && onNavigateToPosition(blackIndex)
                          }
                        >
                          {move.blackMove}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          <ChessBoard
            fen={fen}
            flipped={playerSide === 'black'}
            playerSide={playerSide}
            lastMove={lastMove}
            showCoordinates={preferences.showCoordinates}
            showOwnPieces={preferences.showOwnPieces}
            showOpponentPieces={preferences.showOpponentPieces}
            pieceShapeMode={preferences.pieceShapeMode}
            pieceColors={preferences.pieceColors}
            boardTheme={preferences.boardTheme}
            rounded={false}
            evaluationMark={evaluationMark}
          />

          {/* Navigation Controls */}
          {movesLength > 0 && (
            <div
              className="bg-card flex items-center justify-center"
              style={{ aspectRatio: '8/1' }}
              onClick={(e) => e.stopPropagation()}
            >
              <MoveNavigationControls
                onNavigateToStart={onNavigateToStart}
                onNavigatePrevious={onNavigatePrevious}
                onNavigateNext={onNavigateNext}
                onNavigateToEnd={onNavigateToEnd}
                isPreviousDisabled={
                  currentPosition === -2 || (currentPosition === -1 && movesLength === 0)
                }
                isNextDisabled={
                  currentPosition === -1 || (movesLength > 0 && currentPosition === movesLength - 1)
                }
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
