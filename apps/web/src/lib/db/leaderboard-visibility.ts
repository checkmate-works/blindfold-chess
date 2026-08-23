import { eq } from 'drizzle-orm';

import { profiles } from './schema';

/**
 * The leaderboard opt-out predicate: the profile has not set
 * `hidden_from_leaderboard`.
 *
 * Every ranking read composes this, and the ones that paginate must compose it
 * in *both* halves — `challenge-queries` notes that letting the row query and
 * its COUNT diverge desyncs `totalCount` from what is visible and produces
 * empty trailing pages. Five call sites each wrote the comparison out, which is
 * what makes that easy to get half-right.
 *
 * The three raw-SQL rankings spell it as `NOT p.hidden_from_leaderboard`
 * against an aliased `profiles p`, so they cannot compose a drizzle predicate
 * built on the unaliased table and deliberately keep their own spelling.
 *
 * A leaf module over the schema alone, matching `./games-visibility`.
 */
export function notHiddenFromLeaderboard() {
  return eq(profiles.hiddenFromLeaderboard, false);
}
