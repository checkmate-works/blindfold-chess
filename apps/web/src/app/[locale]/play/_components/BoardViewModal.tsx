'use client';

import { useEffect } from 'react';

import { ChessBoard } from '@/app/_components';
import type { Side } from '@blindfold-chess/core';

import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

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
  onNavigateToStart: () => void;
  onNavigatePrevious: () => void;
  onNavigateNext: () => void;
  onNavigateToEnd: () => void;
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
  onNavigateToStart,
  onNavigatePrevious,
  onNavigateNext,
  onNavigateToEnd,
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
          <ChessBoard
            fen={fen}
            flipped={playerSide === 'black'}
            playerSide={playerSide}
            lastMove={preferences.highlightLastMove && currentPosition === -1 ? lastMove : null}
            showCoordinates={preferences.showCoordinates}
            showOwnPieces={preferences.showOwnPieces}
            showOpponentPieces={preferences.showOpponentPieces}
            pieceShapeMode={preferences.pieceShapeMode}
            pieceColors={preferences.pieceColors}
            boardTheme={preferences.boardTheme}
            className="!rounded-none !shadow-none"
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
                isNextDisabled={currentPosition === -1}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
