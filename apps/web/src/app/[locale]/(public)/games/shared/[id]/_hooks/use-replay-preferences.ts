'use client';

import { useMemo, useState } from 'react';

import { gameUsedNotablePlaySettings, playSettingsAtHalfMove } from '@/lib/games/play-settings-log';
import type { GamePlaySettings, PlaySettingsChangeEntry } from '@/lib/games/saved-game-types';

import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

type Params = {
  /** The viewer's own base preferences. */
  preferences: GamePreferences;
  /** Start-of-game blindfold settings snapshot; null for legacy/plain games. */
  playSettings: GamePlaySettings | null;
  /** Mid-game settings edits, folded per displayed position. */
  playSettingsLog: PlaySettingsChangeEntry[] | null;
  /** The board's navigation position (-2 = overview, -1 = latest, >=0 = ply). */
  currentPosition: number;
  notationMovesLength: number;
};

type Result = {
  reproduceView: boolean;
  setReproduceView: React.Dispatch<React.SetStateAction<boolean>>;
  /** Whether the game ever used non-default settings worth surfacing. */
  showPlaySettings: boolean;
  /** Effective blindfold settings at the displayed half-move, or null. */
  effectivePlaySettings: GamePlaySettings | null;
  /** Preferences to hand the board: revealed, or the player's view when on. */
  boardPreferences: GamePreferences;
};

/**
 * Reconstruct the board preferences for a game replay. By default the board is
 * fully revealed (this is a finished public game); when "reproduce view" is
 * toggled on, the board mirrors how the player actually saw the position —
 * piece obfuscation folded from the start-of-game snapshot plus the mid-game
 * change log, position-aware so it updates as the viewer steps. `boardVisibility`
 * is left untouched (the replay board is always open).
 *
 * Extracted from `GameReplay`, where this was eight interdependent memos.
 */
export function useReplayPreferences({
  preferences,
  playSettings,
  playSettingsLog,
  currentPosition,
  notationMovesLength,
}: Params): Result {
  const [reproduceView, setReproduceView] = useState(false);

  const revealedPreferences = useMemo<GamePreferences>(
    () => ({
      ...preferences,
      showOwnPieces: true,
      showOpponentPieces: true,
      pieceShapeMode: 'normal',
      pieceColors: 'normal',
      pawnHideMode: 'none',
      boardVisibility: 'always',
    }),
    [preferences]
  );

  const showPlaySettings =
    playSettings != null && gameUsedNotablePlaySettings(playSettings, playSettingsLog);

  const effectivePlaySettings = useMemo<GamePlaySettings | null>(() => {
    if (!playSettings) return null;
    const halfMovesShown =
      currentPosition >= 0 ? currentPosition + 1 : currentPosition === -1 ? notationMovesLength : 0;
    return playSettingsAtHalfMove(playSettings, playSettingsLog, halfMovesShown);
  }, [playSettings, playSettingsLog, currentPosition, notationMovesLength]);

  const reflectedPreferences = useMemo<GamePreferences | null>(() => {
    if (!effectivePlaySettings) return null;
    return {
      ...preferences,
      showOwnPieces: effectivePlaySettings.showOwnPieces,
      showOpponentPieces: effectivePlaySettings.showOpponentPieces,
      pieceShapeMode: effectivePlaySettings.pieceShapeMode,
      pieceColors: effectivePlaySettings.pieceColors,
      pawnHideMode: effectivePlaySettings.pawnHideMode,
    };
  }, [preferences, effectivePlaySettings]);

  const boardPreferences =
    reproduceView && reflectedPreferences ? reflectedPreferences : revealedPreferences;

  return {
    reproduceView,
    setReproduceView,
    showPlaySettings,
    effectivePlaySettings,
    boardPreferences,
  };
}
