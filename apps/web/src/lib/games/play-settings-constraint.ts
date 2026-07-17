import type { GamePlaySettings } from './saved-game-types';

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
