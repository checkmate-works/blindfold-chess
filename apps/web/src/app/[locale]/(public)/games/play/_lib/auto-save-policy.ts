import type { GameOutcome } from '@/lib/games/saved-game-types';

import { isGameFinished } from './game-utils';

/**
 * Snapshot of what was last persisted for the game. The auto-save trigger
 * compares the live game state against this to decide whether another save
 * is warranted.
 */
export type LastSavedSnapshot = {
  movesLength: number;
  status: GameOutcome;
};

/**
 * True when both the live status and the last-saved status are terminal — the
 * player is merely viewing a finished game, so there is nothing new to write.
 * Used as an early-out guard inside the save routine.
 */
export function isViewingFinishedGame(
  currentStatus: GameOutcome,
  lastSavedStatus: GameOutcome
): boolean {
  return isGameFinished(currentStatus) && isGameFinished(lastSavedStatus);
}

/**
 * Decides whether the live game state has diverged from the last saved
 * snapshot enough to trigger an auto-save.
 *
 * A save fires when the moves or status changed AND the game is one the
 * player is actively progressing (they have interacted, or moves already
 * exist). A game that was already finished when last saved is never
 * re-saved — this prevents bumping `lastPlayed` while merely viewing a
 * finished game.
 */
export function shouldAutoSave(params: {
  movesLength: number;
  status: GameOutcome;
  lastSaved: LastSavedSnapshot;
  hasPlayerInteracted: boolean;
}): boolean {
  const { movesLength, status, lastSaved, hasPlayerInteracted } = params;

  if (isGameFinished(lastSaved.status)) {
    return false;
  }

  const hasNewMoves = movesLength !== lastSaved.movesLength;
  const hasStatusChanged = status !== lastSaved.status;
  const isGameProgressing = movesLength > 0;

  return (hasNewMoves || hasStatusChanged) && (hasPlayerInteracted || isGameProgressing);
}

/**
 * Whether the pending-changes flag should be raised for the current save.
 * Skipped only when the game is finished and its status did not change —
 * i.e. a no-op save that should not light up the "unsaved changes" toast.
 */
export function shouldMarkPendingChanges(
  status: GameOutcome,
  lastSaved: LastSavedSnapshot
): boolean {
  const hasStatusChanged = status !== lastSaved.status;
  return !isGameFinished(status) || hasStatusChanged;
}
