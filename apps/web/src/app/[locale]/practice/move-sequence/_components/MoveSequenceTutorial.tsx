'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';

import { Button, ChessBoard } from '@/app/_components';
import { ChessGameManager } from '@blindfold-chess/features/chess-core';
import { FaPlay } from 'react-icons/fa';

import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type { Locale } from '@/app/[locale]/_lib/types';

import { encodeMoveSequenceToBase64 } from '../_lib/share';

type Props = {
  locale: Locale;
};

// Simple example: Italian Game opening
const TUTORIAL_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const TUTORIAL_PGN = '1. e4 e5 2. Nf3 Nc6 3. Bc4';
const TUTORIAL_MOVES = ['e4', 'e5', 'Nf3', 'Nc6', 'Bc4'];

const MOVE_INTERVAL = 1000;

export function MoveSequenceTutorial({ locale }: Props) {
  const t = useTranslations('practice.moveSequence');
  const router = useRouter();
  const { preferences } = useGamePreferences();

  const [currentFen, setCurrentFen] = useState(TUTORIAL_FEN);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const chessRef = useRef<ChessGameManager | null>(null);

  useEffect(() => {
    chessRef.current = new ChessGameManager(TUTORIAL_FEN);
  }, []);

  const playNextMove = useCallback(
    (fromIndex?: number) => {
      if (!chessRef.current) return;

      const nextIndex = fromIndex !== undefined ? fromIndex : currentMoveIndex + 1;

      if (nextIndex >= TUTORIAL_MOVES.length) {
        setIsPlaying(false);
        setHasPlayed(true);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        return;
      }

      const move = TUTORIAL_MOVES[nextIndex];
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
    },
    [currentMoveIndex]
  );

  const handlePlay = () => {
    if (isPlaying) return;

    chessRef.current = new ChessGameManager(TUTORIAL_FEN);
    setCurrentFen(TUTORIAL_FEN);
    setCurrentMoveIndex(-1);
    setLastMove(null);
    setIsPlaying(true);

    setTimeout(() => {
      playNextMove(0);
    }, 500);
  };

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

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
    };
  }, []);

  const handleStart = () => {
    const params = new URLSearchParams();
    const encoded = encodeMoveSequenceToBase64(TUTORIAL_FEN, TUTORIAL_PGN);
    params.set('data', encoded);
    params.set('mode', 'tutorial');
    params.set('skipMemorize', '1');
    router.push(`/${locale}/practice/move-sequence/session?${params.toString()}`);
  };

  return (
    <div className="max-w-md mx-auto">
      <div className="bg-card rounded-2xl p-6 shadow-sm border border-border">
        <p className="text-muted-foreground mb-6 whitespace-pre-line">
          {t('tutorial.description')}
        </p>

        <div className="mb-4">
          <div className="relative">
            <ChessBoard
              fen={currentFen}
              flipped={false}
              showCoordinates={true}
              boardTheme={preferences.boardTheme}
              lastMove={preferences.highlightLastMove ? lastMove : null}
            />

            {!isPlaying && !hasPlayed && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-md">
                <button
                  onClick={handlePlay}
                  className="bg-white/90 hover:bg-white text-gray-800 rounded-full p-6 shadow-lg transition-all hover:scale-110"
                  aria-label={t('play')}
                >
                  <FaPlay className="w-8 h-8 ml-1" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Move display */}
        <div className="bg-secondary/30 rounded-lg p-3 mb-6">
          <p className="text-sm text-muted-foreground mb-1">{t('moves')}</p>
          <p className="font-mono text-sm">
            {TUTORIAL_MOVES.map((move, i) => (
              <span
                key={i}
                className={i <= currentMoveIndex ? 'text-foreground' : 'text-muted-foreground'}
              >
                {i % 2 === 0 && (
                  <span className="text-muted-foreground">{Math.floor(i / 2) + 1}. </span>
                )}
                {move}{' '}
              </span>
            ))}
          </p>
        </div>

        {hasPlayed && (
          <Button
            onClick={handleStart}
            variant="primary"
            size="lg"
            className="w-full"
            icon={<FaPlay />}
          >
            {t('tutorial.start')}
          </Button>
        )}

        {!hasPlayed && (
          <p className="text-sm text-center text-muted-foreground">{t('tutorial.watchFirst')}</p>
        )}
      </div>
    </div>
  );
}
