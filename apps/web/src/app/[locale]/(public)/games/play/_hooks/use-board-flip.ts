import { useCallback, useState } from 'react';

import type { Side } from '@blindfold-chess/types';

type UseBoardFlipParams = {
  playerSide: Side;
  /**
   * Initial value of the manual flip toggle (default `false`). Lets a caller
   * seed the board orientation from outside (e.g. a shareable `?color=` URL on
   * the shared-game page) so the first render is already correctly oriented,
   * with no post-mount flip.
   */
  initialFlipped?: boolean;
};

type UseBoardFlipReturn = {
  /** Whether the board is currently flipped relative to the default orientation */
  isBoardFlipped: boolean;
  /** Effective flip state combining player side with manual toggle */
  effectiveFlipped: boolean;
  /** Toggle the board flip state */
  toggleFlip: () => void;
};

/**
 * Manages board flip state for chess board orientation.
 *
 * By default, the board is oriented so the player's pieces are at the bottom
 * (white at bottom for white, black at bottom for black). The flip toggle
 * reverses the orientation.
 */
export function useBoardFlip({
  playerSide,
  initialFlipped = false,
}: UseBoardFlipParams): UseBoardFlipReturn {
  const [isBoardFlipped, setIsBoardFlipped] = useState(initialFlipped);

  const effectiveFlipped = playerSide === 'black' ? !isBoardFlipped : isBoardFlipped;

  const toggleFlip = useCallback(() => {
    setIsBoardFlipped((prev) => !prev);
  }, []);

  return {
    isBoardFlipped,
    effectiveFlipped,
    toggleFlip,
  };
}
