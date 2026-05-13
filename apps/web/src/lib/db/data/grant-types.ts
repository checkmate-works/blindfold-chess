/**
 * Grant type policy configuration — source of truth for durations per automated grant trigger.
 * See schema.ts `userGrants` @design tags for why this lives in code, not DB.
 */
export const GRANT_TYPES = ['admin_manual', 'topic_post'] as const;
export type GrantType = (typeof GRANT_TYPES)[number];
export type AutomatedGrantType = Exclude<GrantType, 'admin_manual'>;

/**
 * Every benefit type that an admin or automated grant can issue.
 *
 * - `ad_free`        Hides AdSense slots site-wide.
 * - `paywall_access` Unlocks a scoped resource (currently article paywall).
 *                    Scoped via `resourceType` + `resourceId` on the row.
 * - `maia_access`    Unlocks the Maia AI engine on /games/new/* selectors,
 *                    bypassing the future paywall gate. Granted via admin
 *                    or as a paid-plan entitlement.
 *
 * This array IS the validation source — both the admin grant action and
 * the UI dropdown read it directly. To add a new benefit type, append a
 * value here and the rest of the system follows.
 */
export const BENEFIT_TYPES = ['ad_free', 'paywall_access', 'maia_access'] as const;
export type BenefitType = (typeof BENEFIT_TYPES)[number];

export function isBenefitType(v: string): v is BenefitType {
  return (BENEFIT_TYPES as readonly string[]).includes(v);
}

export type GrantTypeConfig = {
  benefitType: BenefitType;
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
  topic_post: { benefitType: 'ad_free', durationDays: 5 },
};

/**
 * `topic_posts.topicType` values that earn an automated `topic_post` ad-free
 * grant when a user creates a text-bearing post.
 *
 * Scoped to the **standalone topic surfaces** (`square`, `opening`) only —
 * `position_memory` / `position_puzzle` are excluded because, although they
 * share the `topic_posts` table, in product language they are "comments on a
 * problem" rather than first-class submissions; the grant for those flows is
 * earned by *creating the problem* via `createPosition` / `createPuzzle`
 * (see `applyAutomatedGrant` callers in those actions). `chunk` posts have
 * always been excluded.
 *
 * Used as the single source of truth for:
 *
 *   1. `createPostBase` — gates `applyAutomatedGrant` on `topicType` membership.
 *   2. `/[locale]/faq` "Ways to earn ad-free benefits" table — see the
 *      `actions.*` keys under `faq.items.adFreeBenefits` in every locale.
 *
 * Add a topic type here together with its i18n label in every locale.
 */
const TOPIC_POST_GRANT_TOPIC_TYPES = ['square', 'opening'] as const;

export type TopicPostGrantTopicType = (typeof TOPIC_POST_GRANT_TOPIC_TYPES)[number];

export function isTopicPostGrantTopicType(v: string): v is TopicPostGrantTopicType {
  return (TOPIC_POST_GRANT_TOPIC_TYPES as readonly string[]).includes(v);
}

export function isGrantType(v: string): v is GrantType {
  return (GRANT_TYPES as readonly string[]).includes(v);
}
