import type { ServerTranslator } from '@/i18n/translator';

import { ALL_RANK_SLUGS } from '@/lib/db/data/ranks';

/**
 * Rank slug → localized display name, for the admin users screens.
 *
 * Shared between the list tab and the stats tab because the two are
 * cross-linked — the distribution bar navigates into the filtered list — so a
 * label change applied to only one copy would make the bar and the list it
 * opens name the same rank differently.
 */
export function buildRankNames(t: ServerTranslator): Record<string, string> {
  return Object.fromEntries(ALL_RANK_SLUGS.map((slug) => [slug, t(`stats.rankNames.${slug}`)]));
}
