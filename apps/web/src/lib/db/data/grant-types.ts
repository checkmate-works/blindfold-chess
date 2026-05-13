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

export function isGrantType(v: string): v is GrantType {
  return (GRANT_TYPES as readonly string[]).includes(v);
}
