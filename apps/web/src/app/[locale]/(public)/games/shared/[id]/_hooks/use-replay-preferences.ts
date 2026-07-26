'use client';

import { useCallback, useMemo, useState } from 'react';

import { gameUsedNotablePlaySettings, playSettingsAtHalfMove } from '@/lib/games/play-settings-log';
import type { GamePlaySettings, PlaySettingsChangeEntry } from '@/lib/games/saved-game-types';

import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

type PositionPreferences = {
  /** Effective blindfold settings at the given half-move, or null. */
  effectivePlaySettings: GamePlaySettings | null;
  /** Preferences to hand the board: revealed, or the player's view when reproducing. */
  boardPreferences: GamePreferences;
  /** See {@link Result.hiddenPieceStyle}. */
  hiddenPieceStyle: 'absent' | 'ghost';
};

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
  /**
   * Same computation as {@link effectivePlaySettings} / {@link boardPreferences}
   * / {@link hiddenPieceStyle}, but for an arbitrary position rather than the
   * live board's `currentPosition` — needed by the "By Move" quick-peek modal,
   * whose navigation is independent of the live replay (see
   * `useQuickPeekModal`). Without this, the modal always showed the live
   * board's obfuscation regardless of which position was previewed inside it,
   * so scrubbing past a mid-game "reveal" change-log entry kept pieces hidden.
   * Shares the same `reproduceView` on/off state as the live board.
   */
  preferencesAt: (position: number) => PositionPreferences;
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

  // Position → { effective settings, board preferences, hidden-piece style },
  // shared by the live board (via `currentPosition` below) and the quick-peek
  // modal (via `preferencesAt`, called with its own independent position).
  const computeAt = useCallback(
    (position: number): PositionPreferences => {
      if (!playSettings) {
        return {
          effectivePlaySettings: null,
          boardPreferences: revealedPreferences,
          hiddenPieceStyle: 'absent',
        };
      }
      const halfMovesShown =
        position >= 0 ? position + 1 : position === -1 ? notationMovesLength : 0;
      const effectivePlaySettings = playSettingsAtHalfMove(
        playSettings,
        playSettingsLog,
        halfMovesShown
      );
      // Only a truly-never-shown board (`never`) means the player saw no pieces
      // at this position, so fold it into "hide both sides" — the per-piece
      // hide path then renders them all as ghosts, matching side / pawn hides.
      // `'peek'` is NOT folded here: a peek reveals the real board with
      // `pieceShapeMode`/`pieceColors`/etc. applied, so those settings must
      // pass through unchanged (same as `'always'`) to reproduce what the
      // player actually saw whenever they looked. Folding `'peek'` into
      // hide-both would silently discard e.g. a Go-stone side for every
      // peek-mode game, since `'peek'` is `DEFAULT_BOARD_VISIBILITY`.
      const boardHidden = effectivePlaySettings.boardVisibility === 'never';
      const reflectedPreferences: GamePreferences = {
        ...preferences,
        showOwnPieces: boardHidden ? false : effectivePlaySettings.showOwnPieces,
        showOpponentPieces: boardHidden ? false : effectivePlaySettings.showOpponentPieces,
        pieceShapeMode: effectivePlaySettings.pieceShapeMode,
        pieceColors: effectivePlaySettings.pieceColors,
        pawnHideMode: effectivePlaySettings.pawnHideMode,
      };
      const reproducing = reproduceView;
      return {
        effectivePlaySettings,
        boardPreferences: reproducing ? reflectedPreferences : revealedPreferences,
        // While reproducing, hidden pieces are drawn as faint ghosts (what the
        // player could not see); a fully-revealed board has nothing hidden to style.
        hiddenPieceStyle: reproducing ? 'ghost' : 'absent',
      };
    },
    [
      playSettings,
      playSettingsLog,
      notationMovesLength,
      preferences,
      revealedPreferences,
      reproduceView,
    ]
  );

  const { effectivePlaySettings, boardPreferences, hiddenPieceStyle } = useMemo(
    () => computeAt(currentPosition),
    [computeAt, currentPosition]
  );

  return {
    reproduceView,
    setReproduceView,
    showPlaySettings,
    effectivePlaySettings,
    boardPreferences,
    hiddenPieceStyle,
    preferencesAt: computeAt,
  };
}
