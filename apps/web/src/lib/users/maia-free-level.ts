/**
 * The level from which Maia games stop costing coins.
 *
 * Maia is the only engine with a per-game coin charge, and for its first
 * five months almost nobody paid it: a handful of users bought one or two
 * games and stopped while still holding coins, and most coin holders never
 * tried it at all. The per-game charge was therefore not funding anything;
 * it was keeping an opponent that differentiates the product from the
 * players most likely to value it. Tying the exemption to level, rather than
 * removing the charge outright, keeps a cost on the 46 MB model download:
 * Exp accrues only from completed practice and games (daily-capped for
 * games), so a throwaway account cannot reach this level in one sitting.
 *
 * Lv5 is roughly 1,100 Exp — a few sessions of regular use — and sits just
 * above the point where the level distribution thins out, so it reaches the
 * returning players without extending to everyone who saved one result.
 * Below it, the coin charge and its confirmation flow stay exactly as before.
 *
 * Shared by the server gate (`canUseMaia`, `startMaiaGame`) and the client
 * presentation (`deriveMaiaCardMode`, the unlock hint), so the policy has a
 * single value. Not a `points` constant: it is a condition on *who pays*,
 * not on *how much*, and `MAIA_GAME_POINT_COST` is unchanged by it.
 */
export const MAIA_FREE_LEVEL = 5;

/** Whether a player at `level` plays Maia without a coin charge. */
export function isMaiaFreeAtLevel(level: number): boolean {
  return level >= MAIA_FREE_LEVEL;
}
