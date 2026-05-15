/**
 * Legacy `user_grants.grant_type` enum.
 *
 * Originally this file also held `GRANT_TYPE_DEFAULTS` (the duration policy
 * for automated grants) and `TOPIC_POST_GRANT_TOPIC_TYPES` (the gate for
 * which topic surfaces auto-issued an ad_free grant). Both were removed
 * when the point economy replaced automated `user_grants` issuance for UGC
 * — see `@/lib/points` for the new flow. The remaining enum / guard pair
 * is preserved for legacy grant-history display surfaces (mypage benefits
 * page, benefit_grant notifications) that still need to interpret
 * pre-migration rows.
 */

export const GRANT_TYPES = ['admin_manual', 'topic_post'] as const;
export type GrantType = (typeof GRANT_TYPES)[number];

/**
 * Every benefit type that an admin or automated grant can issue.
 *
 * - `ad_free`        Hides AdSense slots site-wide.
 * - `paywall_access` Unlocks a scoped resource (currently article paywall).
 *                    Scoped via `resourceType` + `resourceId` on the row.
 *
 * Maia engine access is intentionally NOT a benefit type: it is gated by an
 * active subscription or a per-game point charge (see `canUseMaia`), not by
 * a `user_grants` row.
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
