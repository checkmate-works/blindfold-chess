'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';

import { Button, ChessBoard } from '@/app/_components';
import { Chess } from 'chess.js';
import { FaPlay } from 'react-icons/fa';

import type { AlgebraicNotation } from '@/lib/types';

import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import type { MoveSequenceData } from '../_lib/types';

type Props = {
  data: MoveSequenceData;
  onComplete: () => void;
};

const MOVE_INTERVAL = 1000; // 1 second between moves

export function MoveSequenceMemorize({ data, onComplete }: Props) {
  const t = useTranslations('practice.moveSequence');
  const { preferences } = useGamePreferences();

  const [currentFen, setCurrentFen] = useState(data.fen);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const chessRef = useRef<Chess | null>(null);

  // Initialize chess instance
  useEffect(() => {
    chessRef.current = new Chess(data.fen);
  }, [data.fen]);

  // Play moves one by one
  const playNextMove = useCallback(() => {
    if (!chessRef.current) return;

    const nextIndex = currentMoveIndex + 1;

    if (nextIndex >= data.moves.length) {
      // All moves played
      setIsPlaying(false);
      setHasPlayed(true);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const move = data.moves[nextIndex];
    try {
      const result = chessRef.current.move(move);
      if (result) {
        setCurrentFen(chessRef.current.fen());
        setCurrentMoveIndex(nextIndex);
        setLastMove({ from: result.from, to: result.to });
      }
    } catch (error) {
      console.error('Error playing move:', error);
      setIsPlaying(false);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
  }, [currentMoveIndex, data.moves]);

  // Handle play button click
  const handlePlay = () => {
    if (isPlaying) return;

    // Reset to initial position
    chessRef.current = new Chess(data.fen);
    setCurrentFen(data.fen);
    setCurrentMoveIndex(-1);
    setLastMove(null);
    setIsPlaying(true);

    // Play first move immediately, then set interval
    setTimeout(() => {
      playNextMove();
    }, 500);
  };

  // Continue playing moves at interval
  useEffect(() => {
    if (isPlaying && currentMoveIndex >= 0) {
      intervalRef.current = setTimeout(playNextMove, MOVE_INTERVAL);
    }

    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying, currentMoveIndex, playNextMove]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
    };
  }, []);

  // Format move display
  const formatMoveDisplay = (moves: AlgebraicNotation[], currentIndex: number) => {
    const displayMoves: string[] = [];
    for (let i = 0; i <= currentIndex && i < moves.length; i++) {
      const moveNum = Math.floor(i / 2) + 1;
      const isWhite = i % 2 === 0;
      if (isWhite) {
        displayMoves.push(`${moveNum}. ${moves[i]}`);
      } else {
        displayMoves[displayMoves.length - 1] += ` ${moves[i]}`;
      }
    }
    return displayMoves.join(' ');
  };

  const flipped = data.playerColor === 'b';

  return (
    <div className="space-y-4">
      {/* Board */}
      <div className="flex justify-center">
        <div className="w-full max-w-md">
          <div className="relative">
            <ChessBoard
              fen={currentFen}
              flipped={flipped}
              showCoordinates={preferences.showCoordinates}
              boardTheme={preferences.boardTheme}
              lastMove={preferences.highlightLastMove ? lastMove : null}
            />

            {/* Play button overlay */}
            {!isPlaying && !hasPlayed && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-md">
                <button
                  onClick={handlePlay}
                  className="bg-white/90 hover:bg-white text-gray-800 rounded-full p-6 shadow-lg transition-all hover:scale-110"
                  aria-label={t('play')}
                >
                  <FaPlay className="w-12 h-12" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Move display */}
      <div className="bg-card rounded-xl shadow-sm border border-border p-4">
        <h3 className="text-sm font-medium text-muted-foreground mb-2">{t('moves')}</h3>
        <p className="font-mono text-sm min-h-[2rem]">
          {currentMoveIndex >= 0
            ? formatMoveDisplay(data.moves, currentMoveIndex)
            : t('pressPlayToStart')}
        </p>
      </div>

      {/* Progress */}
      {isPlaying && (
        <div className="bg-card rounded-xl shadow-sm border border-border p-4">
          <p className="text-sm text-center text-muted-foreground">
            {t('playingMove', { current: currentMoveIndex + 1, total: data.moves.length })}
          </p>
        </div>
      )}

      {/* Continue button */}
      {hasPlayed && (
        <Button onClick={onComplete} variant="primary" size="lg" className="w-full">
          {t('startRecall')}
        </Button>
      )}
    </div>
  );
}
