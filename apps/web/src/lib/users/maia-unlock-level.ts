/**
 * The level from which a player may play against Maia.
 *
 * Maia is the one engine that costs something to hand out — a 46 MB model
 * download per browser — so it is not open to every account. Tying it to
 * level keeps a cost on that download: Exp accrues only from completed
 * practice and games (daily-capped for games), so a throwaway account cannot
 * reach this level in one sitting.
 *
 * Lv5 is roughly 1,100 Exp — a few sessions of regular use — and sits just
 * above the point where the level distribution thins out, so it reaches the
 * returning players without extending to everyone who saved one result.
 *
 * Until 2026-11 a player below this level could instead pay one coin per
 * game. Almost nobody did (ten players in the currency's lifetime), and the
 * coin economy was retired; the level is now the only way in. The players
 * who had paid were raised to this level with a one-off Exp grant
 * (`exp_events.source = 'maia_access_carryover'`) so none of them lost the
 * engine.
 *
 * Shared by the server gate (`canUseMaia`) and the client presentation
 * (`deriveMaiaCardMode`, the unlock hint), so the policy has a single value.
 */
export const MAIA_UNLOCK_LEVEL = 5;

/** Whether a player at `level` may play against Maia. */
export function isMaiaUnlockedAtLevel(level: number): boolean {
  return level >= MAIA_UNLOCK_LEVEL;
}
