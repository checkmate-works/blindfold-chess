/**
 * Score Leaderboard index redirect (`/leaderboard/score` → `/leaderboard/score/[period]`)
 *
 * @description
 * Absorbs any legacy `?period=` query string and permanently redirects to the
 * canonical category-first score leaderboard URL. Uses `permanentRedirect`
 * (308) so crawlers consolidate link equity onto the new URL. Default period
 * is `all-time`.
 *
 * Static routing precedence: this file sits at a static segment (`score`),
 * so Next.js dispatches `/leaderboard/score` here rather than to the legacy
 * `[period]/page.tsx` shim with `period="score"` — which is why the legacy
 * shim additionally 404s when it sees `period === 'score'` or `period === 'exp'`
 * (defense in depth in case precedence ever flips).
 */
import {
  type PeriodIndexRedirectProps,
  redirectToPeriodIndex,
} from '../_lib/period-index-redirect';

export default async function ScoreLeaderboardIndexRedirect(props: PeriodIndexRedirectProps) {
  return redirectToPeriodIndex('score', props);
}
