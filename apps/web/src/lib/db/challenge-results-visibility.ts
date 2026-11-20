import type { SQL } from 'drizzle-orm';
import { isNull } from 'drizzle-orm';

import { challengeResults } from './schema';

/**
 * The live-result predicate: the challenge result has not been removed by
 * moderation (`challenge_results.deleted_at IS NULL`), against the unaliased
 * table.
 *
 * Every read of `challenge_results` composes this. The reads are spread over
 * the rankings, the per-user history, the score comparison, the badges and the
 * feed, and missing it in any one of them leaves a removed score on display.
 * Reads that paginate must compose it in *both* halves — the row query and its
 * COUNT — or `totalCount` stops matching what is visible and trailing pages
 * come back empty.
 *
 * Raw SQL that reads the table under an alias cannot compose a drizzle
 * predicate built on the unaliased table, so it spells the condition itself as
 * `deleted_at IS NULL` on its alias. A convention test checks the read sites
 * and catches one that does neither.
 *
 * A leaf module over the schema alone, matching `./leaderboard-visibility`.
 */
export function liveChallengeResult(): SQL {
  return isNull(challengeResults.deletedAt);
}
