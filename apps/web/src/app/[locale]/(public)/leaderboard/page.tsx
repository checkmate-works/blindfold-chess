/**
 * Leaderboard index redirect (`/leaderboard` → `/leaderboard/score/[period]`)
 *
 * @description
 * Absorbs any legacy `?period=` query string and permanently redirects to the
 * canonical category-first leaderboard URL. Uses `permanentRedirect` (308) so
 * crawlers consolidate link equity onto the new URL. Default period is
 * `all-time`.
 */
import { type PeriodIndexRedirectProps, redirectToPeriodIndex } from './_lib/period-index-redirect';

export default async function LeaderboardIndexRedirect(props: PeriodIndexRedirectProps) {
  return redirectToPeriodIndex('score', props);
}
