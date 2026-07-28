import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

import { foldBoardVisibility } from './play-settings-log';

/** The display axes that decide whether a piece is drawn, and how. */
export type RevealableAxes = Pick<
  GamePreferences,
  | 'boardVisibility'
  | 'showOwnPieces'
  | 'showOpponentPieces'
  | 'pieceShapeMode'
  | 'pieceColors'
  | 'pawnHideMode'
>;

/**
 * The same preferences with every blindfold axis turned off — the position as
 * a sighted player would see it.
 *
 * The counterpart of {@link foldBoardVisibility}: that one reconstructs what
 * the player could see, this one undoes it. Both exist because a review surface
 * generally wants to offer the two side by side ("as I played it" ⇄ "reveal"),
 * and they must agree on which axes make up the blindfold — a reveal that
 * forgets `pawnHideMode` leaves an "unhidden" board still missing its pawns.
 *
 * Non-blindfold display preferences (`boardTheme`, `showCoordinates`,
 * `highlightLastMove`, …) are passed through untouched: revealing a position is
 * not an excuse to restyle the board out from under the viewer.
 */
export function revealPieces<T extends RevealableAxes>(preferences: T): T {
  return {
    ...preferences,
    boardVisibility: 'always',
    showOwnPieces: true,
    showOpponentPieces: true,
    pieceShapeMode: 'normal',
    pieceColors: 'normal',
    pawnHideMode: 'none',
  };
}

/**
 * Whether a faithful "as played" reproduction of these preferences would hide
 * or obfuscate anything at all — i.e. whether {@link revealPieces} would make
 * any visible difference, and so whether offering a reveal toggle is
 * meaningful.
 *
 * `boardVisibility` is folded in first, so a game played on a masked board
 * counts as hiding both sides even though its per-side flags were both true.
 */
export function hidesAnyPiece(preferences: RevealableAxes): boolean {
  const axes = foldBoardVisibility(preferences);

  return (
    !axes.showOwnPieces ||
    !axes.showOpponentPieces ||
    axes.pawnHideMode !== 'none' ||
    axes.pieceShapeMode !== 'normal' ||
    axes.pieceColors !== 'normal'
  );
}
