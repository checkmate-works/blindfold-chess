'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { useLoadGame } from '@/app/[locale]/(public)/games/play/result/_hooks/useLoadGame';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type {
  GamePreferences,
  PerGamePreferences,
} from '@/app/[locale]/_contexts/GamePreferencesContext';

/**
 * Merge the saved game's per-game preference snapshot over the user's global
 * preferences, mirroring the play screen's merge (`usePlayClientPreferences`).
 * Legacy records may omit later-added fields, so those fall back to global.
 */
export function mergePerGamePreferences(
  global: GamePreferences,
  perGame: PerGamePreferences | undefined
): GamePreferences {
  if (!perGame) return global;
  return {
    ...global,
    boardVisibility: perGame.boardVisibility ?? global.boardVisibility,
    highlightLastMove: perGame.highlightLastMove,
    showPieceDestinations: perGame.showPieceDestinations ?? global.showPieceDestinations,
    showOwnPieces: perGame.showOwnPieces,
    showOpponentPieces: perGame.showOpponentPieces,
    pieceShapeMode: perGame.pieceShapeMode,
    pieceColors: perGame.pieceColors,
    pawnHideMode: perGame.pawnHideMode ?? global.pawnHideMode,
    moveInputMode: perGame.moveInputMode ?? global.moveInputMode,
  };
}

/**
 * The recall screen's *local* copy of the game preferences. It is seeded
 * once — after both the global preferences (localStorage) and the saved-game
 * lookup have settled — from the game's `gamePreferences` snapshot merged
 * over the globals, and mutated only in-memory afterwards: edits are never
 * written back to global preferences nor recorded in a preferenceChangeLog.
 * The review session is intentionally ephemeral.
 */
export function useRecallPreferences({ gameId }: { gameId: string | undefined }) {
  const { preferences: globalPreferences, isHydrated } = useGamePreferences();
  const loadState = useLoadGame(gameId ?? null);

  const [preferences, setPreferences] = useState<GamePreferences>(globalPreferences);
  const updatePreferences = useCallback((updates: Partial<GamePreferences>) => {
    setPreferences((prev) => ({ ...prev, ...updates }));
  }, []);

  // Seed once; after seeding, the user owns this state.
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current) return;
    if (!isHydrated) return;
    if (gameId && loadState.status === 'loading') return;
    seededRef.current = true;
    const perGame = loadState.status === 'loaded' ? loadState.game.gamePreferences : undefined;
    setPreferences(mergePerGamePreferences(globalPreferences, perGame));
  }, [isHydrated, gameId, loadState, globalPreferences]);

  const handlePerGamePrefChange = useCallback(
    <K extends keyof PerGamePreferences>(key: K, value: PerGamePreferences[K]) => {
      updatePreferences({ [key]: value } as Partial<GamePreferences>);
    },
    [updatePreferences]
  );

  return { preferences, updatePreferences, handlePerGamePrefChange };
}
