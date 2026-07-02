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
  /**
   * How the board should draw pieces the player could not see: `'ghost'` while
   * reproducing their view (faint true piece), else `'absent'`. See
   * `ChessBoard.hiddenPieceStyle`.
   */
  hiddenPieceStyle: 'absent' | 'ghost';
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
  // Default ON: show the board as the player actually saw it (their blindfold
  // obfuscation at each position). Viewers can toggle off to fully reveal it.
  const [reproduceView, setReproduceView] = useState(true);

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
    // A hidden whole board (`never` / `peek`) means the player saw no pieces at
    // this position, so fold it into "hide both sides" — the per-piece hide path
    // then renders them all as ghosts, matching side / pawn hides. `always`
    // keeps the per-piece settings as-is.
    const boardHidden =
      effectivePlaySettings.boardVisibility === 'never' ||
      effectivePlaySettings.boardVisibility === 'peek';
    return {
      ...preferences,
      showOwnPieces: boardHidden ? false : effectivePlaySettings.showOwnPieces,
      showOpponentPieces: boardHidden ? false : effectivePlaySettings.showOpponentPieces,
      pieceShapeMode: effectivePlaySettings.pieceShapeMode,
      pieceColors: effectivePlaySettings.pieceColors,
      pawnHideMode: effectivePlaySettings.pawnHideMode,
    };
  }, [preferences, effectivePlaySettings]);

  const reproducing = reproduceView && reflectedPreferences != null;
  const boardPreferences = reproducing ? reflectedPreferences : revealedPreferences;
  // While reproducing, hidden pieces are drawn as faint ghosts (what the player
  // could not see); a fully-revealed board has nothing hidden to style.
  const hiddenPieceStyle: 'absent' | 'ghost' = reproducing ? 'ghost' : 'absent';

  return {
    reproduceView,
    setReproduceView,
    showPlaySettings,
    effectivePlaySettings,
    boardPreferences,
    hiddenPieceStyle,
  };
}
