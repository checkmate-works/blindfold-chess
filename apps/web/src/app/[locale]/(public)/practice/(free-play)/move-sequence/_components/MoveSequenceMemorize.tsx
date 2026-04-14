'use client';

import { useState } from 'react';

import { BoardSkeleton, Button, ChessBoard } from '@/app/_components';
import { useSafeTranslations as useTranslations } from '@/i18n/use-safe-translations';
import { FaPlay, FaRedo } from 'react-icons/fa';

import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { useMovePlayback } from '../_hooks/use-move-playback';
import type { MoveSequenceData } from '../_lib/types';

type Props = {
  data: MoveSequenceData;
  onComplete: () => void;
};

const MOVE_INTERVAL = 1000; // 1 second between moves

export function MoveSequenceMemorize({ data, onComplete }: Props) {
  const t = useTranslations('practice.moveSequence');
  const { preferences, isLoaded } = useGamePreferences();

  const [selectedMoveIndex, setSelectedMoveIndex] = useState<number | null>(null);

  const {
    currentFen,
    currentMoveIndex,
    isPlaying,
    hasPlayed,
    lastMove,
    play: handlePlayCore,
    jumpToMove: jumpToMoveCore,
  } = useMovePlayback({
    initialFen: data.fen,
    moves: data.moves,
    intervalMs: MOVE_INTERVAL,
    autoPlayDelayMs: 500,
    onPlaybackComplete: () => {
      setSelectedMoveIndex(data.moves.length - 1);
    },
  });

  // Handle play button click
  const handlePlay = () => {
    setSelectedMoveIndex(null);
    handlePlayCore();
  };

  // Jump to a specific move position
  const jumpToMove = (targetIndex: number) => {
    if (isPlaying) return;
    jumpToMoveCore(targetIndex);
    setSelectedMoveIndex(targetIndex);
  };

  const flipped = data.playerColor === 'b';

  // Render clickable move list
  const renderMoveList = () => {
    const elements: React.ReactNode[] = [];

    for (let i = 0; i < data.moves.length; i++) {
      const moveNum = Math.floor(i / 2) + 1;
      const isWhite = i % 2 === 0;
      const isPlayed = i <= currentMoveIndex;
      const isSelected = i === selectedMoveIndex;

      if (isWhite) {
        // Add move number before white's move
        elements.push(
          <span key={`num-${moveNum}`} className="text-muted-foreground mr-1">
            {moveNum}.
          </span>
        );
      }

      elements.push(
        <button
          key={`move-${i}`}
          onClick={() => jumpToMove(i)}
          disabled={isPlaying || !hasPlayed}
          className={`font-mono text-sm px-1 rounded transition-colors ${
            isSelected
              ? 'bg-primary text-primary-foreground'
              : isPlayed
                ? 'text-foreground hover:bg-muted cursor-pointer'
                : 'text-muted-foreground'
          } ${!isPlaying && hasPlayed ? 'hover:bg-muted' : ''} disabled:cursor-default`}
        >
          {data.moves[i]}
        </button>
      );

      // Add space after each move
      elements.push(<span key={`space-${i}`}> </span>);
    }

    return elements;
  };

  return (
    <div className="space-y-4">
      {/* Board */}
      <div className="flex justify-center">
        <div className="w-full max-w-md">
          <div className="relative">
            {!isLoaded ? (
              <BoardSkeleton />
            ) : (
              <ChessBoard
                fen={currentFen}
                flipped={flipped}
                showCoordinates={preferences.showCoordinates}
                boardTheme={preferences.boardTheme}
                lastMove={preferences.highlightLastMove ? lastMove : null}
              />
            )}

            {/* Play button overlay - show when not playing */}
            {isLoaded && !isPlaying && !hasPlayed && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 rounded-md">
                <button
                  onClick={handlePlay}
                  className="bg-white/90 hover:bg-white text-foreground rounded-full p-6 shadow-lg transition-all hover:scale-110"
                  aria-label={t('play')}
                >
                  <FaPlay className="w-12 h-12 ml-1" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Move display */}
      <div className="bg-card rounded-md shadow-sm border border-border p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-medium text-muted-foreground">{t('moves')}</h3>
          {hasPlayed && !isPlaying && (
            <button
              onClick={handlePlay}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              aria-label={t('replay')}
            >
              <FaRedo className="w-3 h-3" />
              <span>{t('replay')}</span>
            </button>
          )}
        </div>
        <div className="font-mono text-sm min-h-[2rem] flex flex-wrap items-center">
          {hasPlayed || currentMoveIndex >= 0 ? renderMoveList() : t('pressPlayToStart')}
        </div>
        {hasPlayed && !isPlaying && (
          <p className="text-xs text-muted-foreground mt-2">{t('clickMoveToJump')}</p>
        )}
      </div>

      {/* Progress */}
      {isPlaying && (
        <div className="bg-card rounded-md shadow-sm border border-border p-4">
          <p className="text-sm text-center text-muted-foreground">
            {t('playingMove', { current: currentMoveIndex + 1, total: data.moves.length })}
          </p>
        </div>
      )}

      {/* Continue button */}
      {hasPlayed && !isPlaying && (
        <Button onClick={onComplete} variant="primary" size="lg" className="w-full">
          {t('startRecall')}
        </Button>
      )}
    </div>
  );
}
