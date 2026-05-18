import { useEffect, useRef } from 'react';

import type { AlgebraicNotation } from '@blindfold-chess/types';

import type { GameOutcome } from '@/lib/games/saved-game-types';

import { shouldAutoSave, shouldMarkPendingChanges } from '../_lib/auto-save-policy';
import type { SaveGame } from './use-auto-save';

type UseSaveTriggerOptions = {
  moves: AlgebraicNotation[];
  status: GameOutcome;
  enabled: boolean;
  currentGameId: string | undefined;
  saveOnInitRef: React.RefObject<boolean>;
  hasInitialSaveExecuted: React.RefObject<boolean>;
  hasPlayerInteracted: React.RefObject<boolean>;
  hasPendingChanges: React.RefObject<boolean>;
  isInitialSyncSave: React.RefObject<boolean>;
  lastSavedMovesLength: React.RefObject<number>;
  lastSavedStatus: React.RefObject<GameOutcome>;
  saveGame: SaveGame;
};

/**
 * Drives the auto-save trigger: an effect that, on every moves/status change,
 * decides whether to persist the game.
 *
 * It owns the small "enabled" state machine — while auto-save is disabled, or
 * on the disabled → enabled transition, it only syncs the last-saved snapshot
 * so a stale save doesn't fire the moment auto-save turns on. The actual
 * save/skip decision is delegated to the pure `auto-save-policy` functions.
 */
export function useSaveTrigger({
  moves,
  status,
  enabled,
  currentGameId,
  saveOnInitRef,
  hasInitialSaveExecuted,
  hasPlayerInteracted,
  hasPendingChanges,
  isInitialSyncSave,
  lastSavedMovesLength,
  lastSavedStatus,
  saveGame,
}: UseSaveTriggerOptions) {
  const prevEnabled = useRef(enabled);

  useEffect(() => {
    // While auto-save is disabled, or on the disabled -> enabled transition,
    // keep the last-saved snapshot in sync but don't save. This avoids firing
    // a save the instant auto-save becomes enabled (e.g. right after a game is
    // loaded and `enabled` flips true in the same render cycle).
    const justEnabled = !prevEnabled.current && enabled;
    if (!enabled || justEnabled) {
      lastSavedMovesLength.current = moves.length;
      lastSavedStatus.current = status;
      prevEnabled.current = enabled;

      // On the enabled transition with no moves loaded yet, the upcoming
      // moves update is a load-sync, not a player action. Flag it so the
      // resulting save doesn't count as a session save (which would wrongly
      // raise the "saved" toast). In production the transition always fires
      // before moves are set via setMovesTo, so moves.length is 0 here; the
      // guard also protects against future render-timing changes.
      if (justEnabled && moves.length === 0) {
        isInitialSyncSave.current = true;
      }
      return;
    }
    prevEnabled.current = enabled;

    // Skip while the initial save is still pending for a brand-new game.
    if (saveOnInitRef.current && !currentGameId && !hasInitialSaveExecuted.current) {
      return;
    }

    const lastSaved = {
      movesLength: lastSavedMovesLength.current,
      status: lastSavedStatus.current,
    };

    if (
      !shouldAutoSave({
        movesLength: moves.length,
        status,
        lastSaved,
        hasPlayerInteracted: hasPlayerInteracted.current,
      })
    ) {
      return;
    }

    if (shouldMarkPendingChanges(status, lastSaved)) {
      hasPendingChanges.current = true;
    }

    // Save immediately so that both player and AI moves are persisted.
    saveGame(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the ref args have stable identity; only the primitive deps matter
  }, [moves.length, status, saveGame, currentGameId, enabled]);
}
