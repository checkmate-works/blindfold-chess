'use client';

import { useCallback, useEffect, useState } from 'react';

// Same pacing as PuzzleSolutionReplay / MoveSequenceMemorize, so playback
// feels consistent across surfaces.
const MOVE_INTERVAL_MS = 1000;
const PLAY_INITIAL_DELAY_MS = 500;

export type KataPlayback = {
  /** Current position index, already clamped to [0, maxPly]. */
  ply: number;
  /** Whether the reveal target has been reached (verdict may be shown). */
  revealed: boolean;
  /** Whether the initial Play overlay should still cover the board. */
  showOverlay: boolean;
  /** Jump to a ply; pauses playback and dismisses the overlay. */
  goTo: (ply: number) => void;
  /** (Re)start playback from the beginning, hiding the verdict until arrival. */
  play: () => void;
};

/**
 * The kata replay's playback state machine: an initial Play overlay, timed
 * stepping from the start to `stopPly` (a short lead-in beat, then one ply
 * per interval), reveal-on-arrival, and manual navigation that pauses
 * playback. Extracted from the viewer so the component is presentation only
 * and the timer/keyboard wiring lives in one testable place.
 */
export function useKataPlayback({
  maxPly,
  stopPly,
}: {
  /** Highest valid position index (positions.length - 1). */
  maxPly: number;
  /** The ply playback stops (and the verdict reveals) at; clamped to maxPly. */
  stopPly: number;
}): KataPlayback {
  const target = Math.max(0, Math.min(stopPly, maxPly));

  const [ply, setPly] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [revealed, setRevealed] = useState(target === 0);

  useEffect(() => {
    if (!isPlaying) return;
    let interval: ReturnType<typeof setInterval> | undefined;
    const timeout = setTimeout(() => {
      setPly((p) => (p < target ? p + 1 : p));
      interval = setInterval(() => {
        setPly((p) => (p < target ? p + 1 : p));
      }, MOVE_INTERVAL_MS);
    }, PLAY_INITIAL_DELAY_MS);
    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, target]);

  useEffect(() => {
    if (ply >= target) {
      setIsPlaying(false);
      setRevealed(true);
    }
  }, [ply, target]);

  const clampedPly = Math.min(ply, maxPly);

  const goTo = useCallback(
    (p: number) => {
      setIsPlaying(false);
      setHasStarted(true);
      setPly(Math.max(0, Math.min(maxPly, p)));
    },
    [maxPly]
  );

  const play = useCallback(() => {
    setPly(0);
    setRevealed(target === 0);
    setHasStarted(true);
    setIsPlaying(target > 0);
  }, [target]);

  // ←/→ step through the replay, the same keys the repertoire line viewer binds.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'ArrowLeft') {
        goTo(clampedPly - 1);
      } else if (e.key === 'ArrowRight') {
        goTo(clampedPly + 1);
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [clampedPly, goTo]);

  return {
    ply: clampedPly,
    revealed,
    showOverlay: !isPlaying && !hasStarted && target > 0,
    goTo,
    play,
  };
}
