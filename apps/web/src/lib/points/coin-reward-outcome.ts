import type { PointGrantOutcome } from './grant-points';

/** The ledger row a create earned, as reported back to the caller. */
export type PointGrantReceipt = {
  pointEventId: string;
  amount: number;
};

/**
 * What a create earned in coins, as every create surface reports it.
 *
 * `null` means no grant — either the author was ineligible or the daily cap
 * blocked it outright; `coinCapped` tells those apart, and is also `true`
 * alongside a receipt when the cap merely trimmed the award. Callers turn
 * this into the arrival toast (see `buildCoinToastParams`).
 *
 * Both fields are required and `pointGrant` is nullable rather than
 * optional: the three creates that report this — chunks, positions, topic
 * posts — each answer for the cap on every path, and two of them used to
 * omit the keys entirely while the third returned `null`, so a consumer
 * could not write one check that was right for all of them.
 */
export type CoinRewardOutcome = {
  pointGrant: PointGrantReceipt | null;
  coinCapped: boolean;
};

/**
 * Project a grant outcome onto what the create surface reports. The
 * `capped` / `granted`-with-`cappedDaily` split existed in three copies of
 * this expression, one per create path.
 */
export function toCoinRewardOutcome(outcome: PointGrantOutcome): CoinRewardOutcome {
  return {
    pointGrant:
      outcome.status === 'granted'
        ? { pointEventId: outcome.pointEventId, amount: outcome.amount }
        : null,
    coinCapped:
      outcome.status === 'capped' || (outcome.status === 'granted' && outcome.cappedDaily),
  };
}
