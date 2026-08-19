import { getStartingFen, toPositionKey } from '@blindfold-chess/features/chess-core';

/** Position-identity key of the standard chess starting position. */
const STANDARD_START_KEY = toPositionKey(getStartingFen());

/**
 * Whether a game was played from the standard starting position, start to
 * finish — the extra bar the 1dan (`game_publish_win_hidden_board`) feat
 * demands over 1kyu.
 *
 * Without this, a player could set up a position one move from mate (a custom
 * `startingFen`) — or paste a PGN / seed an opening line that reaches a won
 * position (`setupPlies > 0`) — then play the single hidden-board mating move
 * and claim the black belt. Both cases mean the game was NOT genuinely played
 * blindfolded from move 1, so both disqualify:
 *
 * - `startingFen` present and not the standard start → custom position.
 * - `setupPlies > 0` → leading moves were pre-played at setup, not by the
 *   author during the hidden-board session.
 *
 * `null`/absent on either field is the plain standard-start case (legacy rows
 * and ordinary games store no `startingFen`/`setupPlies`) and passes. Both
 * fields are needed because an opening/PGN start keeps the standard
 * `startingFen` and seeds `moves` instead — see the `setupPlies` TSDoc on the
 * `games` table.
 *
 * Shared by the server evaluator (`rank-evaluation.ts`, the authority over the
 * published row) and the client classifier (`guest-promotion.ts`, the
 * finish-modal pitch and the /games + /dojo publish nudge) so the two cannot
 * disagree about which games are pitched as black-belt material. They did once:
 * the check was added to the evaluator alone, and every win from the
 * getting-started endgame example — a custom position played under the
 * default peekable board — kept being advertised as "publish and you are
 * promoted to 1st Dan" while the server would only ever grant 1kyu for it.
 */
export function startedFromStandardPosition(
  startingFen: string | null | undefined,
  setupPlies: number | null | undefined
): boolean {
  if (startingFen != null && toPositionKey(startingFen) !== STANDARD_START_KEY) return false;
  if (setupPlies != null && setupPlies > 0) return false;
  return true;
}
