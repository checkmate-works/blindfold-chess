import type { PerGamePreferences } from '@/app/[locale]/_contexts/GamePreferencesContext';

/**
 * Difficulty presets — the "training ladder" shown at the top of the board
 * settings.
 *
 * The blindfold settings are several largely orthogonal axes (board
 * visibility, which sides' pieces are shown, stones, single colour, hidden
 * pawns). A preset is a curated point in that space, so a player can pick a
 * difficulty without first learning how the axes combine. Presets are a
 * starting point, not a mode: selecting one writes its field values into the
 * ordinary settings, which stay freely editable afterwards. Nothing about the
 * chosen preset is persisted — the active level is always re-derived from the
 * current values by {@link matchDifficultyPreset}, and settings that match no
 * rung read as "Custom".
 *
 * The rungs are cumulative, so each one is strictly harder than the one below:
 *
 * | Level | boardVisibility | own pieces | opponent pieces | pawnHideMode |
 * | ----- | --------------- | ---------- | --------------- | ------------ |
 * | 1     | always          | shown      | shown           | none         |
 * | 2     | peek            | shown      | shown           | none         |
 * | 3     | peek            | shown      | hidden          | none         |
 * | 4     | peek            | shown      | hidden          | all          |
 * | 5     | never           | —          | —               | —            |
 *
 * - Level 4 keeps level 3's hidden opponent and adds hidden pawns. With the
 *   opponent already fully hidden, `'all'` and `'own'` render the same board;
 *   `'all'` is used because it is the value the "Hide pawns" toggle writes, so
 *   a player who climbs from level 3 by switching that toggle on lands exactly
 *   on level 4 instead of on "Custom".
 * - Level 5 hides the board outright. The piece-appearance fields have no
 *   effect there (the settings panel does not even render their controls), so
 *   they are ignored when matching it; selecting it still resets them to the
 *   neutral values, so re-enabling the board later starts from a clean look.
 * - "Show as stones" (`pieceShapeMode`) and "single colour" (`pieceColors`)
 *   are on no rung and every rung pins them to `'normal'`. They obscure *what*
 *   a piece is rather than *where* it is, which does not order cleanly against
 *   the where-axes above (a stoned full board is not clearly harder or easier
 *   than a peek-only one). They remain available as customisations; turning
 *   either on reads as "Custom".
 * - `aiReplyDuration`, `highlightLastMove` and `showPieceDestinations` are
 *   assists orthogonal to the blindfold depth, so presets neither set nor
 *   compare them.
 *
 * The app's out-of-the-box settings (peek on demand, everything else neutral)
 * are exactly level 2; the defaults are deliberately left as they are rather
 * than moved onto a preset.
 */
export type DifficultyPresetSettings = Pick<
  PerGamePreferences,
  | 'boardVisibility'
  | 'showOwnPieces'
  | 'showOpponentPieces'
  | 'pieceShapeMode'
  | 'pieceColors'
  | 'pawnHideMode'
>;

export const DIFFICULTY_LEVELS = [1, 2, 3, 4, 5] as const;
export type DifficultyLevel = (typeof DIFFICULTY_LEVELS)[number];

const NEUTRAL_PIECES = {
  showOwnPieces: true,
  showOpponentPieces: true,
  pieceShapeMode: 'normal',
  pieceColors: 'normal',
  pawnHideMode: 'none',
} as const satisfies Omit<DifficultyPresetSettings, 'boardVisibility'>;

export const DIFFICULTY_PRESETS: Record<DifficultyLevel, DifficultyPresetSettings> = {
  1: { ...NEUTRAL_PIECES, boardVisibility: 'always' },
  2: { ...NEUTRAL_PIECES, boardVisibility: 'peek' },
  3: { ...NEUTRAL_PIECES, boardVisibility: 'peek', showOpponentPieces: false },
  4: { ...NEUTRAL_PIECES, boardVisibility: 'peek', showOpponentPieces: false, pawnHideMode: 'all' },
  5: { ...NEUTRAL_PIECES, boardVisibility: 'never' },
};

const PRESET_FIELDS = [
  'boardVisibility',
  'showOwnPieces',
  'showOpponentPieces',
  'pieceShapeMode',
  'pieceColors',
  'pawnHideMode',
] as const satisfies ReadonlyArray<keyof DifficultyPresetSettings>;

function matches(settings: DifficultyPresetSettings, preset: DifficultyPresetSettings): boolean {
  if (settings.boardVisibility !== preset.boardVisibility) return false;
  // With the board never shown, the piece-appearance fields change nothing the
  // player can see, so board visibility alone decides the match.
  if (preset.boardVisibility === 'never') return true;
  return PRESET_FIELDS.every((field) => settings[field] === preset[field]);
}

/**
 * The ladder rung the given settings sit on, or `null` when they match none
 * ("Custom"). Fields outside {@link DifficultyPresetSettings} are ignored, so
 * a full `GamePreferences` / `PerGamePreferences` can be passed directly.
 */
export function matchDifficultyPreset(settings: DifficultyPresetSettings): DifficultyLevel | null {
  return DIFFICULTY_LEVELS.find((level) => matches(settings, DIFFICULTY_PRESETS[level])) ?? null;
}
