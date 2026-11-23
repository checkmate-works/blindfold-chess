/**
 * The `user_grants.grant_type` values the app can label.
 *
 * Only `admin_manual` is still issued. `topic_post` rows date from when
 * posting to a topic earned ad-free time automatically; the enum / guard pair
 * stays so the grant-history surfaces (mypage benefits page, benefit_grant
 * notifications) can still interpret them.
 *
 * The table also holds `point_redemption` rows, which are deliberately not
 * listed: they are ad-free days bought with coins, including the one-off
 * conversion of every leftover balance (1 coin = 1 day) when the coin economy
 * was retired in 2026-11. The tables they pointed at through `source_id` are
 * gone, so there is nothing to link to; `isGrantType` rejects the value and
 * the benefits page shows such a grant under the `admin_manual` label.
 */

export const GRANT_TYPES = ['admin_manual', 'topic_post'] as const;
export type GrantType = (typeof GRANT_TYPES)[number];

/**
 * Every benefit type that an admin or automated grant can issue.
 *
 * - `ad_free`        Hides every ad placement site-wide.
 * - `paywall_access` Unlocks a scoped resource (currently article paywall).
 *                    Scoped via `resourceType` + `resourceId` on the row.
 *
 * Maia engine access is intentionally NOT a benefit type: it is gated by
 * level (see `canUseMaia`), not by a `user_grants` row.
 *
 * This array IS the validation source — both the admin grant action and
 * the UI dropdown read it directly. To add a new benefit type, append a
 * value here and the rest of the system follows.
 */
export const BENEFIT_TYPES = ['ad_free', 'paywall_access'] as const;
export type BenefitType = (typeof BENEFIT_TYPES)[number];

export function isBenefitType(v: string): v is BenefitType {
  return (BENEFIT_TYPES as readonly string[]).includes(v);
}

export function isGrantType(v: string): v is GrantType {
  return (GRANT_TYPES as readonly string[]).includes(v);
}
