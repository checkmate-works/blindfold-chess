import type { MetadataRoute } from 'next';

import { SUPPORTED_LOCALES } from '@/config';
import { and, eq, isNull } from 'drizzle-orm';

import { db, positions, profiles } from '@/lib/db';
import { profileNotDeleted } from '@/lib/db/profile-not-deleted';

import { BASE_URL, buildSitemapSection, generateAlternates } from './shared';

/**
 * `/u/[username]/problems/{puzzles,position-memory}` is gated to authors who
 * have posted at least one problem of that type — an empty per-type list is
 * low-value crawl surface, and enumerating every registered username
 * (regardless of whether they've ever posted) would read as thin/spammy
 * content at scale. This does not affect indexability of the pages
 * themselves (no `noindex` is set); it only controls sitemap enumeration.
 */
async function buildProblemAuthorEntries(
  now: Date,
  type: 'puzzle' | 'memory',
  routeSegment: 'puzzles' | 'position-memory'
): Promise<MetadataRoute.Sitemap> {
  return buildSitemapSection(`Error fetching ${type} problem authors for sitemap`, async () => {
    const entries: MetadataRoute.Sitemap = [];
    const authors = await db
      .selectDistinct({ username: profiles.username })
      .from(positions)
      .innerJoin(profiles, eq(positions.userId, profiles.id))
      // `profileNotDeleted` rather than `isNull(profiles.deletedAt)`: the
      // exclusion has to hold over every row in `positions`, and testing the
      // live side of `profiles` there is what the helper's `@design` note
      // documents as the spelling that seq-scans the whole table. The join
      // stays — it is how the username is projected — but it no longer filters.
      .where(
        and(
          eq(positions.type, type),
          isNull(positions.deletedAt),
          profileNotDeleted(positions.userId)
        )
      );

    for (const { username } of authors) {
      const path = `/u/${username}/problems/${routeSegment}`;
      for (const locale of SUPPORTED_LOCALES) {
        entries.push({
          url: `${BASE_URL}/${locale}${path}`,
          lastModified: now,
          alternates: generateAlternates(path),
        });
      }
    }
    return entries;
  });
}

export async function buildPuzzleProfileEntries(now: Date): Promise<MetadataRoute.Sitemap> {
  return buildProblemAuthorEntries(now, 'puzzle', 'puzzles');
}

export async function buildPositionMemoryProfileEntries(now: Date): Promise<MetadataRoute.Sitemap> {
  return buildProblemAuthorEntries(now, 'memory', 'position-memory');
}
