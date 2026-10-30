/**
 * Exp Leaderboard index redirect (`/leaderboard/exp` → `/leaderboard/exp/[period]`)
 *
 * @description
 * Absorbs any legacy `?period=` query string and permanently redirects to the
 * canonical category-first exp leaderboard URL. Uses `permanentRedirect`
 * (308) so crawlers consolidate link equity onto the new URL. Default period
 * is `all-time`.
 *
 * Static routing precedence: this file sits at a static segment (`exp`),
 * so Next.js dispatches `/leaderboard/exp` here rather than to the legacy
 * `[period]/page.tsx` shim with `period="exp"` — which is why the legacy
 * shim additionally 404s when it sees `period === 'score'` or `period === 'exp'`
 * (defense in depth in case precedence ever flips).
 */
import {
  type PeriodIndexRedirectProps,
  redirectToPeriodIndex,
} from '../_lib/period-index-redirect';

export default async function ExpLeaderboardIndexRedirect(props: PeriodIndexRedirectProps) {
  return redirectToPeriodIndex('exp', props);
}
