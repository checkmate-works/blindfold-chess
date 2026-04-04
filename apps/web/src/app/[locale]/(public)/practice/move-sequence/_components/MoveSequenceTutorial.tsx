'use client';

import { useRouter } from 'next/navigation';

import { BoardSkeleton, Button, ChessBoard } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaPlay } from 'react-icons/fa';

import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type { Locale } from '@/app/[locale]/_lib/types';

import { useMovePlayback } from '../_hooks/use-move-playback';
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
  const { preferences, isLoaded } = useGamePreferences();

  const {
    currentFen,
    currentMoveIndex,
    isPlaying,
    hasPlayed,
    lastMove,
    play: handlePlay,
  } = useMovePlayback({
    initialFen: TUTORIAL_FEN,
    moves: TUTORIAL_MOVES,
    intervalMs: MOVE_INTERVAL,
    autoPlayDelayMs: 500,
  });

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
            {!isLoaded ? (
              <BoardSkeleton />
            ) : (
              <ChessBoard
                fen={currentFen}
                flipped={false}
                showCoordinates={true}
                boardTheme={preferences.boardTheme}
                lastMove={preferences.highlightLastMove ? lastMove : null}
              />
            )}

            {isLoaded && !isPlaying && !hasPlayed && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-md">
                <button
                  onClick={handlePlay}
                  className="bg-white/90 hover:bg-white text-foreground rounded-full p-6 shadow-lg transition-all hover:scale-110"
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
