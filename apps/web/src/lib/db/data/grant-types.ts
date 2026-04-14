/**
 * Grant type policy configuration — source of truth for durations per automated grant trigger.
 * See schema.ts `userGrants` @design tags for why this lives in code, not DB.
 */
export const GRANT_TYPES = ['admin_manual', 'topic_post', 'puzzle_creation', 'campaign'] as const;
export type GrantType = (typeof GRANT_TYPES)[number];
export type AutomatedGrantType = Exclude<GrantType, 'admin_manual'>;

export type GrantTypeConfig = {
  benefitType: 'ad_free' | 'paywall_access';
  durationDays: number;
};

/**
 * Default duration policy per automated grant type.
 *
 * This is the canonical source of truth referenced by `userGrants` schema TSDoc
 * (see `schema.ts` `@design No durationDays column`). Changing a value here
 * affects only NEW grants created after the change — already-issued grants
 * retain their concrete `expiresAt`. Modify with that semantic in mind, and
 * use git history as the audit trail for policy changes.
 */
export const GRANT_TYPE_DEFAULTS: Record<AutomatedGrantType, GrantTypeConfig> = {
  topic_post: { benefitType: 'ad_free', durationDays: 7 },
  puzzle_creation: { benefitType: 'ad_free', durationDays: 14 },
  campaign: { benefitType: 'ad_free', durationDays: 30 },
};

export function isGrantType(v: string): v is GrantType {
  return (GRANT_TYPES as readonly string[]).includes(v);
}
