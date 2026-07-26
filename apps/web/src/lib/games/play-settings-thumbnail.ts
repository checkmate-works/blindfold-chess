import type { BlindfoldDisplaySettings } from '@blindfold-chess/features/board-display';
import type { Side } from '@blindfold-chess/types';

import { playSettingsAreNotable } from './play-settings-log';
import type { GamePlaySettings } from './saved-game-types';

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

  const boardHidden = playSettings.boardVisibility === 'never';

  return {
    ownColor: playerColor === 'white' ? 'w' : 'b',
    showOwnPieces: boardHidden ? false : playSettings.showOwnPieces,
    showOpponentPieces: boardHidden ? false : playSettings.showOpponentPieces,
    pieceShapeMode: playSettings.pieceShapeMode,
    pieceColors: playSettings.pieceColors,
    pawnHideMode: playSettings.pawnHideMode,
    hiddenPieceStyle: 'ghost',
  };
}
