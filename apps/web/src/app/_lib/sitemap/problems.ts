import type { MetadataRoute } from 'next';

import { SUPPORTED_LOCALES } from '@/config';
import * as Sentry from '@sentry/nextjs';
import { and, eq, isNull } from 'drizzle-orm';

import { db, positions, profiles } from '@/lib/db';

import { BASE_URL, generateAlternates } from './shared';

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
  const entries: MetadataRoute.Sitemap = [];

  try {
    const authors = await db
      .selectDistinct({ username: profiles.username })
      .from(positions)
      .innerJoin(profiles, eq(positions.userId, profiles.id))
      .where(
        and(eq(positions.type, type), isNull(positions.deletedAt), isNull(profiles.deletedAt))
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
  } catch (error) {
    console.error(`Error fetching ${type} problem authors for sitemap:`, error);
    Sentry.captureException(error);
  }

  return entries;
}

export async function buildPuzzleProfileEntries(now: Date): Promise<MetadataRoute.Sitemap> {
  return buildProblemAuthorEntries(now, 'puzzle', 'puzzles');
}

export async function buildPositionMemoryProfileEntries(now: Date): Promise<MetadataRoute.Sitemap> {
  return buildProblemAuthorEntries(now, 'memory', 'position-memory');
}
