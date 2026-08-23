/**
 * The `/games/play` query param that carries the Maia coin charge a game was
 * started on — the client-minted UUID `startMaiaGame` keyed the charge's
 * ledger row on. `/games/new` appends it after the charge lands; the play
 * session stores it on the saved game ({@link Game.maiaChargeId}) from
 * where the publish form forwards it to `games.maia_charge_id`, which is how
 * the coin history links a `maia_game` row to the game it paid for.
 */
export const MAIA_CHARGE_PARAM = 'maiaCharge';

/** Read the param; `undefined` when absent or empty. */
export function maiaChargeFromUrlParams(params: URLSearchParams): string | undefined {
  return params.get(MAIA_CHARGE_PARAM) || undefined;
}
