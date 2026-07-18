import type { GamePlaySettings, PlaySettingsChangeEntry } from './saved-game-types';

/**
 * The settings of a game played with nothing hidden — a fully sighted game of
 * chess against the engine. Every field is at the value that reveals the most.
 *
 * Note this is NOT the app's default: `boardVisibility` defaults to `'peek'`,
 * so a player who changes nothing is already playing under a constraint. Full
 * sight is something you have to deliberately turn on.
 */
const FULLY_SIGHTED: GamePlaySettings = {
  boardVisibility: 'always',
  showOwnPieces: true,
  showOpponentPieces: true,
  pieceShapeMode: 'normal',
  pieceColors: 'normal',
  pawnHideMode: 'none',
};

/**
 * Whether a game was played under any blindfold constraint at all.
 *
 * True unless every setting was at its most-revealing value — so hiding only
 * pawns, dimming piece colours, or simply leaving the board on `'peek'` all
 * count. The bar is deliberately low: the 1kyu requirement asks for "some
 * constraint", not for a full blindfold.
 *
 * Judged on the START-OF-GAME snapshot alone (`games.play_settings`), not on
 * `play_settings_log`. A game that begins fully sighted and is constrained
 * later does not count, and one that begins constrained does — even if the
 * player reveals the board partway. That is the intended reading of
 * 「途中まで目隠し…でもOK」 and it keeps the check to one column.
 *
 * `null` — a legacy row, a game published before the column existed, or one
 * whose settings blob failed validation at publish time (`normalizePlaySettings`
 * stores `null` rather than rejecting the publish) — is NOT a constraint. There
 * is no way to tell those apart, so an unknown game cannot earn the rank.
 */
export function isConstrainedPlaySettings(settings: GamePlaySettings | null | undefined): boolean {
  if (!settings) return false;

  return (Object.keys(FULLY_SIGHTED) as (keyof GamePlaySettings)[]).some(
    (key) => settings[key] !== FULLY_SIGHTED[key]
  );
}

/**
 * Whether the board stayed hidden (`boardVisibility !== 'always'`) for the
 * ENTIRE game — the start-of-game snapshot plus every mid-game change,
 * unlike {@link isConstrainedPlaySettings} which only ever looks at the
 * start snapshot.
 *
 * `log` is the self-reported `games.play_settings_log`: a `to`-only change
 * list, so "never reverted to `'always'`" is exactly "no entry whose `key`
 * is `boardVisibility` and `to` is `'always'`" — no need to fold the log to
 * find this, unlike {@link playSettingsAtHalfMove} which needs the running
 * state at a specific position.
 *
 * `null` settings (legacy row / failed validation) are not eligible, same
 * posture as {@link isConstrainedPlaySettings}.
 */
export function maintainedHiddenBoard(
  settings: GamePlaySettings | null | undefined,
  log: readonly PlaySettingsChangeEntry[] | null | undefined
): boolean {
  if (!settings) return false;
  if (settings.boardVisibility === 'always') return false;

  return !(log ?? []).some((entry) => entry.key === 'boardVisibility' && entry.to === 'always');
}
