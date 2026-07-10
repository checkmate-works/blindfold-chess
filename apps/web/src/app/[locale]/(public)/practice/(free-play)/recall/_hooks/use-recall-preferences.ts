'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import type { GamePlaySettings, PlaySettingsChangeEntry } from '@/lib/games/saved-game-types';

import { useLoadGame } from '@/app/[locale]/(public)/games/play/result/_hooks/useLoadGame';
import { useGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';
import type {
  GamePreferences,
  PerGamePreferences,
} from '@/app/[locale]/_contexts/GamePreferencesContext';

/**
 * The settings keys `PlaySettingsChangeLog` (shared with games/play/result)
 * treats as display-relevant — mirrors the same subset games narrows a full
 * preference-change log down to before rendering it (see
 * `normalizePlaySettingsLog` in `@/lib/games/play-settings-log`). Edits to
 * other per-game keys (highlightLastMove, moveInputMode, aiReplyDuration,
 * showPieceDestinations) aren't logged — they aren't "what did the board
 * look like" changes.
 */
const DISPLAY_SETTING_KEYS = [
  'boardVisibility',
  'showOwnPieces',
  'showOpponentPieces',
  'pieceShapeMode',
  'pieceColors',
  'pawnHideMode',
] as const satisfies ReadonlyArray<keyof GamePlaySettings>;

function isDisplaySettingKey(key: string): key is (typeof DISPLAY_SETTING_KEYS)[number] {
  return (DISPLAY_SETTING_KEYS as readonly string[]).includes(key);
}

function toGamePlaySettings(preferences: GamePreferences): GamePlaySettings {
  return {
    boardVisibility: preferences.boardVisibility,
    showOwnPieces: preferences.showOwnPieces,
    showOpponentPieces: preferences.showOpponentPieces,
    pieceShapeMode: preferences.pieceShapeMode,
    pieceColors: preferences.pieceColors,
    pawnHideMode: preferences.pawnHideMode,
  };
}

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
 * written back to global preferences nor persisted to a saved game. The
 * review session is intentionally ephemeral — but display-relevant edits
 * (board visibility / piece visibility / shape / color) ARE tracked into an
 * in-memory `preferenceChangeLog`, purely so the completion summary can show
 * a Change Log matching games/play/result's — it's never written anywhere.
 */
export function useRecallPreferences({
  gameId,
  currentMoveIndex,
}: {
  gameId: string | undefined;
  /** Half-move count at the time of an edit — anchors the change log the
   *  same way play's `moves.length` does (see `usePreferenceState`). */
  currentMoveIndex: number;
}) {
  const { preferences: globalPreferences, isHydrated } = useGamePreferences();
  const loadState = useLoadGame(gameId ?? null);

  const [preferences, setPreferences] = useState<GamePreferences>(globalPreferences);
  const updatePreferences = useCallback((updates: Partial<GamePreferences>) => {
    setPreferences((prev) => ({ ...prev, ...updates }));
  }, []);

  // Start-of-session snapshot of the display-relevant settings — the
  // baseline `preferenceChangeLog` folds onto for the Change Log, captured
  // once at the same moment `preferences` itself is seeded.
  const [initialPlaySettings, setInitialPlaySettings] = useState<GamePlaySettings | null>(null);
  const [preferenceChangeLog, setPreferenceChangeLog] = useState<PlaySettingsChangeEntry[]>([]);

  // Seed once; after seeding, the user owns this state.
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current) return;
    if (!isHydrated) return;
    if (gameId && loadState.status === 'loading') return;
    seededRef.current = true;
    const perGame = loadState.status === 'loaded' ? loadState.game.gamePreferences : undefined;
    const merged = mergePerGamePreferences(globalPreferences, perGame);
    setPreferences(merged);
    setInitialPlaySettings(toGamePlaySettings(merged));
  }, [isHydrated, gameId, loadState, globalPreferences]);

  const handlePerGamePrefChange = useCallback(
    <K extends keyof PerGamePreferences>(key: K, value: PerGamePreferences[K]) => {
      if (isDisplaySettingKey(key) && preferences[key] !== value) {
        setPreferenceChangeLog((prev) => [
          ...prev,
          { atMoveIndex: currentMoveIndex, key, to: value } as PlaySettingsChangeEntry,
        ]);
      }
      updatePreferences({ [key]: value } as Partial<GamePreferences>);
    },
    [updatePreferences, preferences, currentMoveIndex]
  );

  return {
    preferences,
    updatePreferences,
    handlePerGamePrefChange,
    initialPlaySettings,
    preferenceChangeLog,
  };
}
