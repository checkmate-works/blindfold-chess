/**
 * Coin spend catalog — the single place that declares how many coins each
 * spendable action costs. When a new "spend coins to do X" feature is added,
 * its price belongs here, and the debit itself goes through `debitSpendable`
 * (internal-ledger.ts) — this file is only the price list that drives it.
 *
 * @design Prices live in code, not the DB
 *
 * Every `point_events` row carries its own concrete `delta`, so lowering or
 * raising a price here only affects FUTURE charges — coins already spent at a
 * prior rate (and their `/mypage/coins` history) are untouched. That is what
 * makes these numbers cheap to treat as provisional and re-tune later: change
 * the figure, ship, done. No data migration, no backfill.
 *
 * Existing per-feature prices that predate this catalog still live next to
 * their consumer (`MAIA_GAME_POINT_COST` in constants.ts, `AD_FREE_DAYS_PER_POINT`
 * in redeem-points.ts). New cross-cutting spend prices land here.
 */

/**
 * The visibility tiers a Kata (repertoire) can be published at, cheapest
 * first. `building` is a lifecycle state (an unpublished draft), NOT a chosen
 * visibility, so it is deliberately absent — a repertoire's `status` column is
 * `'building' | RepertoireVisibility`.
 */
export const REPERTOIRE_VISIBILITIES = ['public', 'followers_only', 'private'] as const;
export type RepertoireVisibility = (typeof REPERTOIRE_VISIBILITIES)[number];

export function isRepertoireVisibility(v: string): v is RepertoireVisibility {
  return (REPERTOIRE_VISIBILITIES as readonly string[]).includes(v);
}

/**
 * Coins to unlock each Kata visibility tier. `public` is free (the default on
 * creation); the paid tiers gate WHO may view the course (followers-only →
 * owner + followers; private → owner only), enforced at the read path.
 *
 * Provisional — see the module `@design` note. The charge on a visibility
 * change is the INCREMENT above the highest price already paid for that
 * repertoire (see {@link repertoireVisibilityCharge}), so a user who has paid
 * to unlock a tier can flip freely among the tiers at or below it for free.
 */
export const REPERTOIRE_VISIBILITY_COST: Record<RepertoireVisibility, number> = {
  public: 0,
  followers_only: 1,
  private: 3,
};

/**
 * Coins to charge to move a repertoire to `target`, given `alreadyPaid` — the
 * coins already spent on THIS repertoire's visibility (the sum of its prior
 * `repertoire_visibility` debits, which by construction equals the highest
 * tier price ever reached). Charge only the increment above that, never
 * negative: so `public → private` costs the full private price the first time,
 * but `private → public → private` is free, and reaching a cheaper tier than
 * one already unlocked is free too.
 *
 * Pure — the caller supplies `alreadyPaid` (read from the ledger inside the
 * charging transaction).
 */
export function repertoireVisibilityCharge(
  target: RepertoireVisibility,
  alreadyPaid: number
): number {
  return Math.max(0, REPERTOIRE_VISIBILITY_COST[target] - alreadyPaid);
}
