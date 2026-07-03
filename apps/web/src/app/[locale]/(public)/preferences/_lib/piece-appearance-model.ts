import type { Side } from '@blindfold-chess/types';

import type { GamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

/**
 * Pure piece-appearance UI model for the Game settings panel.
 *
 * The settings store persists piece appearance as independent primitives
 * (`showOwnPieces`/`showOpponentPieces` booleans, a 4-value `pieceShapeMode`,
 * a 4-value `pawnHideMode`), but the panel presents them as radio/toggle
 * controls with different shapes (a 3-way visibility radio, a stones toggle +
 * side selector, a pawn-hide toggle + side selector). This module owns the
 * translation between the two representations plus the option-availability /
 * realignment rules, so the component is left with markup only.
 */

/** The subset of GamePreferences the appearance model reads. */
export type PieceAppearanceSettings = Pick<
  GamePreferences,
  'showOwnPieces' | 'showOpponentPieces' | 'pieceShapeMode' | 'pawnHideMode'
>;

export type PieceShapeMode = GamePreferences['pieceShapeMode'];

const ALL_SHAPE_OPTIONS = ['normal', 'circles-all', 'circles-own', 'circles-opponent'] as const;

// Piece visibility is exposed as a single-choice radio rather than two
// independent checkboxes: the would-be fourth combination (neither side shown)
// is just a piece-less board, indistinguishable from "Hide the board", so the
// three meaningful modes below cover the space without the redundant state — and
// fit on one row.
export const PIECE_VISIBILITY_MODES = ['all', 'own', 'opponent'] as const;
export type PieceVisibilityMode = (typeof PIECE_VISIBILITY_MODES)[number];

export const PIECE_VISIBILITY_PRESETS: Record<
  PieceVisibilityMode,
  { showOwnPieces: boolean; showOpponentPieces: boolean }
> = {
  all: { showOwnPieces: true, showOpponentPieces: true },
  own: { showOwnPieces: true, showOpponentPieces: false },
  opponent: { showOwnPieces: false, showOpponentPieces: true },
};

// Piece shape is exposed as a "show as stones" toggle plus a side selector that
// only appears when both sides are visible (the only case where stoning just one
// side is meaningful). The three sides reuse the Both / Own / Opponent labels.
export const STONE_SIDE_MODES = ['all', 'own', 'opponent'] as const;
export type StoneSideMode = (typeof STONE_SIDE_MODES)[number];

export const STONE_SIDE_TO_SHAPE: Record<StoneSideMode, PieceShapeMode> = {
  all: 'circles-all',
  own: 'circles-own',
  opponent: 'circles-opponent',
};

// Pawn-hide is a "hide pawns" toggle plus a Both / Own / Opponent side selector.
// The selector values map 1:1 to the non-'none' members of `pawnHideMode`, and
// it stays visible whenever the toggle is on — hiding one side's pawns is
// meaningful even if the other side is fully hidden, so (unlike stones) there is
// no both-visible gate.
export const PAWN_HIDE_SIDE_MODES = ['all', 'own', 'opponent'] as const satisfies ReadonlyArray<
  Exclude<GamePreferences['pawnHideMode'], 'none'>
>;

// Which colours to sample for each Piece Color option.
export const PIECE_COLOR_SAMPLES: Record<
  'normal' | 'white-only' | 'black-only',
  ReadonlyArray<'w' | 'b'>
> = {
  normal: ['w', 'b'],
  'white-only': ['w'],
  'black-only': ['b'],
};

/**
 * Map the two underlying visibility booleans to the radio's single choice. The
 * neither-shown legacy combination (unreachable from the radio) falls back to
 * 'own' and self-heals on the next selection.
 */
export function derivePieceVisibilityMode(
  settings: Pick<PieceAppearanceSettings, 'showOwnPieces' | 'showOpponentPieces'>
): PieceVisibilityMode {
  return settings.showOwnPieces ? (settings.showOpponentPieces ? 'all' : 'own') : 'opponent';
}

/**
 * Piece shape derived state. `stonesOn` = any non-normal shape; the side
 * selector only matters when both sides are visible. `stonesDefaultShape` is
 * the stones mode for whatever is visible right now — used when turning stones
 * on and when realigning an out-of-range shape after a visibility change.
 */
export function deriveStonesState(
  settings: Pick<PieceAppearanceSettings, 'showOwnPieces' | 'showOpponentPieces' | 'pieceShapeMode'>
): {
  stonesOn: boolean;
  bothVisible: boolean;
  stonesDefaultShape: PieceShapeMode;
  stonesSide: StoneSideMode;
} {
  const bothVisible = settings.showOwnPieces && settings.showOpponentPieces;
  return {
    stonesOn: settings.pieceShapeMode !== 'normal',
    bothVisible,
    stonesDefaultShape: bothVisible
      ? 'circles-all'
      : settings.showOwnPieces
        ? 'circles-own'
        : 'circles-opponent',
    stonesSide:
      settings.pieceShapeMode === 'circles-own'
        ? 'own'
        : settings.pieceShapeMode === 'circles-opponent'
          ? 'opponent'
          : 'all',
  };
}

/** Pawn-hide derived state: on for any non-'none' mode. */
export function derivePawnHideOn(settings: Pick<PieceAppearanceSettings, 'pawnHideMode'>): boolean {
  return settings.pawnHideMode !== 'none';
}

/**
 * Which shape options remain selectable for the current visibility: stoning a
 * side only makes sense while that side is shown. 'normal' is always valid.
 */
export function getAvailableShapeOptions(
  settings: Pick<PieceAppearanceSettings, 'showOwnPieces' | 'showOpponentPieces'>
): PieceShapeMode[] {
  return ALL_SHAPE_OPTIONS.filter((mode) => {
    if (mode === 'normal') return true;
    if (mode === 'circles-all') return settings.showOwnPieces && settings.showOpponentPieces;
    if (mode === 'circles-own') return settings.showOwnPieces;
    if (mode === 'circles-opponent') return settings.showOpponentPieces;
    return false;
  });
}

/**
 * When a visibility change makes the current stones mode invalid (e.g.
 * 'circles-all' after hiding a side), realign it to the stones mode for what
 * is visible now instead of dropping to 'normal' — this keeps the "show as
 * stones" toggle on across visibility changes. Returns null when no repair is
 * needed ('normal' is always valid, so a stones-off board is never disturbed).
 */
export function realignShapeMode(
  settings: Pick<PieceAppearanceSettings, 'showOwnPieces' | 'showOpponentPieces' | 'pieceShapeMode'>
): PieceShapeMode | null {
  if (getAvailableShapeOptions(settings).includes(settings.pieceShapeMode)) return null;
  return deriveStonesState(settings).stonesDefaultShape;
}

/**
 * Colour samples for the per-option glyphs: "own" follows the player's side.
 */
export function getSideColorSamples(playerSide: Side): {
  ownColor: 'w' | 'b';
  oppColor: 'w' | 'b';
  sideSamples: Record<PieceVisibilityMode, ReadonlyArray<'w' | 'b'>>;
} {
  const ownColor: 'w' | 'b' = playerSide === 'white' ? 'w' : 'b';
  const oppColor: 'w' | 'b' = ownColor === 'w' ? 'b' : 'w';
  return {
    ownColor,
    oppColor,
    sideSamples: {
      all: [ownColor, oppColor],
      own: [ownColor],
      opponent: [oppColor],
    },
  };
}
