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
 * `useReplayPreferences`) evaluated at the opening board the thumbnail shows
 * (half-move 0, so the start snapshot is already the effective state — no log
 * fold needed): a hidden whole board (`never` / `peek`) means the player saw no
 * pieces, so both sides fold to hidden and every piece renders as a faint
 * ghost. Hidden pieces use the `'ghost'` style (a faint true piece) rather than
 * `'absent'`, since an all-absent thumbnail would just be an empty board.
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

  const boardHidden =
    playSettings.boardVisibility === 'never' || playSettings.boardVisibility === 'peek';

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
