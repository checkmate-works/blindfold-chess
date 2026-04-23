import { useCallback, useEffect, useRef, useState } from 'react';

import { ChessGameManager } from '@blindfold-chess/features/chess-core';

type UseMovePlaybackProps = {
  initialFen: string;
  moves: string[];
  intervalMs?: number;
  onPlaybackComplete?: () => void;
  autoPlayDelayMs?: number;
};

export function useMovePlayback({
  initialFen,
  moves,
  intervalMs = 800,
  onPlaybackComplete,
  autoPlayDelayMs,
}: UseMovePlaybackProps) {
  const [currentFen, setCurrentFen] = useState(initialFen);
  const [currentMoveIndex, setCurrentMoveIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasPlayed, setHasPlayed] = useState(false);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);

  const chessRef = useRef<ChessGameManager | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize or reset manager state
  const resetPlayback = useCallback(() => {
    chessRef.current = new ChessGameManager(initialFen);
    setCurrentFen(initialFen);
    setCurrentMoveIndex(-1);
    setIsPlaying(false);
    setHasPlayed(false);
    setLastMove(null);
  }, [initialFen]);

  // Handle underlying initialization on prop change
  useEffect(() => {
    resetPlayback();
  }, [resetPlayback]);

  // Clean up timers on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
      }
    };
  }, []);

  // Internal logical step handler
  const playNextMove = useCallback(
    (fromIndex?: number) => {
      if (!chessRef.current) return;

      const nextIndex = fromIndex !== undefined ? fromIndex : currentMoveIndex + 1;

      if (nextIndex >= moves.length) {
        setIsPlaying(false);
        setHasPlayed(true);
        if (intervalRef.current) {
          clearTimeout(intervalRef.current);
          intervalRef.current = null;
        }
        onPlaybackComplete?.();
        return;
      }

      const move = moves[nextIndex];
      try {
        const result = chessRef.current.move(move);
        if (result) {
          setCurrentFen(chessRef.current.fen());
          setCurrentMoveIndex(nextIndex);
          setLastMove({ from: result.from, to: result.to });
        }
      } catch (error) {
        console.error('Error playing move during playback:', error);
        setIsPlaying(false);
        if (intervalRef.current) {
          clearTimeout(intervalRef.current);
          intervalRef.current = null;
        }
      }
    },
    [currentMoveIndex, moves, onPlaybackComplete]
  );

  // Core recursive effect loop mimicking setInterval via chained setTimeouts for safety
  useEffect(() => {
    if (isPlaying && currentMoveIndex >= 0 && currentMoveIndex < moves.length) {
      intervalRef.current = setTimeout(() => {
        playNextMove();
      }, intervalMs);
    }

    return () => {
      if (intervalRef.current) {
        clearTimeout(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isPlaying, currentMoveIndex, moves.length, intervalMs, playNextMove]);

  // Public methods
  const play = useCallback(() => {
    if (isPlaying) return;

    // Start fresh if we haven't played or reached the end
    if (!hasPlayed || currentMoveIndex >= moves.length - 1) {
      resetPlayback();
    }

    setIsPlaying(true);

    const delay = autoPlayDelayMs !== undefined ? autoPlayDelayMs : 0;
    setTimeout(() => {
      playNextMove(currentMoveIndex === -1 ? 0 : currentMoveIndex + 1);
    }, delay);
  }, [
    isPlaying,
    hasPlayed,
    currentMoveIndex,
    moves.length,
    resetPlayback,
    playNextMove,
    autoPlayDelayMs,
  ]);

  const pause = useCallback(() => {
    setIsPlaying(false);
    if (intervalRef.current) {
      clearTimeout(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const jumpToMove = useCallback(
    (targetIndex: number) => {
      if (isPlaying || targetIndex >= moves.length || targetIndex < -1) return;

      const manager = new ChessGameManager(initialFen);
      let lastMoveResult: { from: string; to: string } | null = null;

      for (let i = 0; i <= targetIndex; i++) {
        try {
          const result = manager.move(moves[i]);
          lastMoveResult = { from: result.from, to: result.to };
        } catch (error) {
          console.error('Error replaying move to index:', error);
          return;
        }
      }

      chessRef.current = manager;
      setCurrentFen(manager.fen());
      setCurrentMoveIndex(targetIndex);
      setLastMove(lastMoveResult);
      setHasPlayed(true); // Treat jumps as having interacted with the playback
    },
    [isPlaying, initialFen, moves]
  );

  return {
    currentFen,
    currentMoveIndex,
    isPlaying,
    hasPlayed,
    lastMove,
    play,
    pause,
    jumpToMove,
    resetPlayback,
  };
}
