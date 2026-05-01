'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useRouter } from 'next/navigation';

import { BoardSkeleton, Button } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaPlay } from 'react-icons/fa';

import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type { Locale } from '@/app/[locale]/_lib/types';

import { TUTORIAL_SKIP_CONFIG } from '../../../_lib/tutorial-skip-config';
import { KnightTourBoard } from './KnightTourBoard';

const TUTORIAL_SKIPPED_KEY = TUTORIAL_SKIP_CONFIG.knightTour.storageKey;

type Props = {
  locale: Locale;
};

// Complete knight tour sequence (64 squares starting from a1)
// Generated using Warnsdorff's algorithm - all 64 squares visited exactly once
const TUTORIAL_SQUARES = [
  'a1',
  'c2',
  'e1',
  'g2',
  'h4',
  'g6',
  'h8',
  'f7',
  'h6',
  'g8',
  'e7',
  'c8',
  'a7',
  'b5',
  'a3',
  'b1',
  'd2',
  'f1',
  'h2',
  'f3',
  'g1',
  'h3',
  'g5',
  'h7',
  'f8',
  'd7',
  'b8',
  'a6',
  'c7',
  'a8',
  'b6',
  'a4',
  'b2',
  'd1',
  'f2',
  'h1',
  'g3',
  'h5',
  'g7',
  'e8',
  'f6',
  'g4',
  'e5',
  'c4',
  'e3',
  'f5',
  'd6',
  'e4',
  'c3',
  'a2',
  'c1',
  'e2',
  'f4',
  'd5',
  'b4',
  'd3',
  'c5',
  'e6',
  'd8',
  'b7',
  'a5',
  'c6',
  'd4',
  'b3',
];

const MOVE_INTERVAL = 600;

export function KnightTourTutorial({ locale }: Props) {
  const t = useTranslations('practice.knightTour');
  const router = useRouter();
  const { preferences, isLoaded } = useGamePreferences();

  const [currentSquare, setCurrentSquare] = useState(TUTORIAL_SQUARES[0]);
  const [visitedSquares, setVisitedSquares] = useState<Map<string, number>>(
    new Map([[TUTORIAL_SQUARES[0], 1]])
  );
  const [currentMoveIndex, setCurrentMoveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const playNextMove = useCallback(() => {
    const nextIndex = currentMoveIndex + 1;

    if (nextIndex >= TUTORIAL_SQUARES.length) {
      setIsPlaying(false);
      setHasPlayed(true);
      return;
    }

    const nextSquare = TUTORIAL_SQUARES[nextIndex];
    setCurrentSquare(nextSquare);
    setVisitedSquares((prev) => {
      const newMap = new Map(prev);
      newMap.set(nextSquare, nextIndex + 1);
      return newMap;
    });
    setCurrentMoveIndex(nextIndex);
  }, [currentMoveIndex]);

  const handlePlay = () => {
    if (isPlaying) return;

    // Reset to initial state
    setCurrentSquare(TUTORIAL_SQUARES[0]);
    setVisitedSquares(new Map([[TUTORIAL_SQUARES[0], 1]]));
    setCurrentMoveIndex(0);
    setIsPlaying(true);
  };

  useEffect(() => {
    if (isPlaying && currentMoveIndex < TUTORIAL_SQUARES.length - 1) {
      timeoutRef.current = setTimeout(playNextMove, MOVE_INTERVAL);
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [isPlaying, currentMoveIndex, playNextMove]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const handleStart = () => {
    localStorage.setItem(TUTORIAL_SKIPPED_KEY, 'true');
    router.push(`/${locale}/practice/knight-tour/session?mode=tutorial&startingSquare=a1`);
  };

  return (
    <div className="max-w-md mx-auto">
      <p className="text-muted-foreground mb-6 whitespace-pre-line">{t('tutorial.description')}</p>

      <p className="text-muted-foreground mb-2">{t('tutorial.exampleTitle')}</p>

      <div className="mb-4">
        <div className="relative">
          {!isLoaded ? (
            <BoardSkeleton />
          ) : (
            <KnightTourBoard
              currentSquare={currentSquare}
              visitedSquares={visitedSquares}
              availableMoves={[]}
              showCoordinates={true}
              showMoveNumbers={true}
              boardTheme={preferences.boardTheme}
            />
          )}

          {isLoaded && !isPlaying && !hasPlayed && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-md">
              <button
                onClick={handlePlay}
                className="bg-white/90 hover:bg-white text-foreground rounded-full p-6 transition-all hover:scale-110"
                aria-label="Play"
              >
                <FaPlay className="w-8 h-8 ml-1" />
              </button>
            </div>
          )}

          {hasPlayed && !isPlaying && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-md">
              <button
                onClick={handlePlay}
                className="bg-white/90 hover:bg-white text-foreground rounded-full p-4 transition-all hover:scale-110"
                aria-label="Replay"
              >
                <FaPlay className="w-6 h-6 ml-0.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Move counter */}
      <div className="bg-secondary/30 rounded-lg p-3 mb-6">
        <p className="text-sm text-muted-foreground">
          {t('squaresVisited')}: {visitedSquares.size} / 64
        </p>
      </div>

      <p className="text-muted-foreground mb-4">{t('tutorial.startHint')}</p>

      <Button onClick={handleStart} variant="primary" size="lg" className="w-full">
        {t('tutorial.start')}
      </Button>
    </div>
  );
}
