'use client';

import { useEffect } from 'react';

import { ChessBoard } from '@/app/_components';
import { isBlackToMoveFromFen } from '@blindfold-chess/features/chess-core/fen';

import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import { useScrollLock } from '@/app/[locale]/_hooks/use-scroll-lock';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  fen: string;
};

export function PuzzleBoardPeekModal({ isOpen, onClose, fen }: Props) {
  const { preferences } = useGamePreferences();

  useScrollLock(isOpen);

  useEffect(() => {
    if (!isOpen) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onClose();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const flipped = isBlackToMoveFromFen(fen);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70" />
      <div className="relative z-10 w-full max-w-lg px-4">
        <div className="rounded-md overflow-hidden shadow-lg">
          <ChessBoard
            fen={fen}
            flipped={flipped}
            showCoordinates={true}
            boardTheme={preferences.boardTheme}
          />
        </div>
      </div>
    </div>
  );
}
