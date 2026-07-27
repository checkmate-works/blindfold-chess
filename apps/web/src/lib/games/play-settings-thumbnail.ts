import type { BlindfoldDisplaySettings } from '@blindfold-chess/features/board-display';
import type { Side } from '@blindfold-chess/types';

import {
  gameUsedNotablePlaySettings,
  playSettingsAreNotable,
  playSettingsAtHalfMove,
} from './play-settings-log';
import type { GamePlaySettings, PlaySettingsChangeEntry } from './saved-game-types';

/**
 * Fold a published game's start-of-game blindfold snapshot into the
 * renderer-agnostic {@link BlindfoldDisplaySettings} that the pure
 * `resolvePieceDisplay` consumes, so a static board thumbnail can show the game
 * "as played" — ghosts for a hidden board, a single colour, or Go stones —
 * instead of a plain, identical-for-everyone opening position.
 *
 * Mirrors the interactive review's reflected-view fold (see
 * `useReplayPreferences`): only `boardVisibility: 'never'` (the board is
 * truly never shown) folds both sides to hidden/ghost. `'peek'` passes
 * `showOwnPieces`/`showOpponentPieces`/`pieceShapeMode`/etc. through
 * unchanged instead of collapsing them — a peek reveals the real board with
 * those per-piece settings applied, so this is what the player actually saw
 * whenever they looked. Folding `'peek'` the same as `'never'` would
 * silently discard `pieceShapeMode`/`pieceColors` (e.g. a Go-stone side)
 * for every peek-mode game, which is the majority (`'peek'` is
 * `DEFAULT_BOARD_VISIBILITY`) — reproduced 2026-07-26 as an "as played" GIF
 * rendering entirely translucent ghosts despite the game having been played
 * with one side shown as stones. Hidden pieces use the `'ghost'` style (a
 * faint true piece) rather than `'absent'`, since an all-absent thumbnail
 * would just be an empty board.
 *
 * Returns null when there is nothing to reflect — a legacy game with no
 * snapshot, or a fully-sighted standard game — so the caller renders the plain
 * thumbnail unchanged.
 */
export function playSettingsToThumbnailDisplay(
  playSettings: GamePlaySettings | null | undefined,
  playerColor: Side
): BlindfoldDisplaySettings | null {
  if (!playSettings || !playSettingsAreNotable(playSettings)) return null;
  return foldPlaySettingsToDisplay(playSettings, playerColor);
}

/**
 * The core snapshot → {@link BlindfoldDisplaySettings} fold shared by
 * {@link playSettingsToThumbnailDisplay} and {@link playSettingsDisplayAtHalfMove}
 * (and, for a forced board reveal, the GIF frame builder's peek-flash frames)
 * — every caller that has already resolved a concrete {@link GamePlaySettings}
 * and just needs it translated to the renderer-agnostic shape. Never
 * null-gated itself; callers decide when there is "nothing to reflect".
 */
export function foldPlaySettingsToDisplay(
  settings: GamePlaySettings,
  playerColor: Side
): BlindfoldDisplaySettings {
  const boardHidden = settings.boardVisibility === 'never';

  return {
    ownColor: playerColor === 'white' ? 'w' : 'b',
    showOwnPieces: boardHidden ? false : settings.showOwnPieces,
    showOpponentPieces: boardHidden ? false : settings.showOpponentPieces,
    pieceShapeMode: settings.pieceShapeMode,
    pieceColors: settings.pieceColors,
    pawnHideMode: settings.pawnHideMode,
    hiddenPieceStyle: 'ghost',
  };
}

/**
 * Same fold as {@link playSettingsToThumbnailDisplay}, but at a specific
 * position rather than only the game's start-of-game snapshot — for a replay
 * (GIF or otherwise) that must show what the player saw at each half-move,
 * not just how the game began. A game that started sighted and was later
 * hidden (or vice versa) needs this: the snapshot alone would say "nothing to
 * reflect" and render every frame as a plain board, contradicting whatever
 * the mid-game change actually showed.
 *
 * The notability gate is therefore {@link gameUsedNotablePlaySettings}
 * (snapshot OR log), not {@link playSettingsAreNotable} (snapshot only) —
 * using the narrower gate here would wrongly return null for a
 * plain-start-then-hidden game.
 */
export function playSettingsDisplayAtHalfMove(
  playSettings: GamePlaySettings | null | undefined,
  playSettingsLog: PlaySettingsChangeEntry[] | null | undefined,
  playerColor: Side,
  halfMovesShown: number
): BlindfoldDisplaySettings | null {
  if (!playSettings || !gameUsedNotablePlaySettings(playSettings, playSettingsLog)) return null;

  const at = playSettingsAtHalfMove(playSettings, playSettingsLog, halfMovesShown);
  return foldPlaySettingsToDisplay(at, playerColor);
}
