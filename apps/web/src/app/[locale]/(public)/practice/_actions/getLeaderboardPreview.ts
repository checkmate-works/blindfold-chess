'use server';

import type { LeaderboardModule } from '@/app/[locale]/(public)/leaderboard/_lib/types';

import {
  type LeaderboardPreviewData,
  resolveLeaderboardWithFallback,
} from '../_lib/resolveLeaderboardWithFallback';

/**
 * Client-callable wrapper around {@link resolveLeaderboardWithFallback} for
 * the TOP3 teaser on the practice landing pages.
 *
 * The teaser is fetched after hydration rather than rendered on the server so
 * that the landing pages read no leaderboard data during their static render.
 * That matters twice over. A route's effective revalidate is the minimum of
 * its segment config and every data-cache entry the render touched, so the
 * 60 s cache behind the ranking used to pin all six landing pages to a
 * one-minute ISR interval — the build's route table showed `1m` against them
 * while the rest of the tree sat at a day. Worse, the ranking is tagged, and
 * `save-practice-result` expires that tag on every completed challenge, so the
 * pages were invalidated by ordinary gameplay no matter how long the interval
 * was. Neither pressure exists once the render stops touching the data.
 *
 * `module` and `key` arrive from the browser and are validated downstream by
 * `getPublicLeaderboard`, which returns an empty page for anything it does not
 * recognise; there is nothing viewer-specific to authorize, since this is the
 * same public ranking the leaderboard pages serve to signed-out visitors.
 */
export async function getLeaderboardPreview(
  module: LeaderboardModule,
  key: string
): Promise<LeaderboardPreviewData | null> {
  return resolveLeaderboardWithFallback(module, key);
}
