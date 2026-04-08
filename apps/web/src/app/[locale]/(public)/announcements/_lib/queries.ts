import { cache } from 'react';

import { unstable_cache } from 'next/cache';

import { and, desc, eq, gte, isNotNull, sql } from 'drizzle-orm';

import { type Announcement, announcements, db } from '@/lib/db';

import { DEFAULT_LOCALE, pickByLocale } from '@/app/[locale]/_lib/locale-utils';

const BANNER_DISPLAY_DAYS = 3;

const pinnedFirstOrdering = [
  sql`${announcements.pinnedAt} DESC NULLS LAST`,
  desc(announcements.publishedAt),
];

/**
 * Deduplicate announcements by slug, keeping the best locale variant for each.
 * Preserves the original ordering of the first occurrence of each slug.
 */
function deduplicateBySlug(rows: Announcement[], locale: string): Announcement[] {
  const grouped = new Map<string, Announcement[]>();
  for (const row of rows) {
    const group = grouped.get(row.slug);
    if (group) {
      group.push(row);
    } else {
      grouped.set(row.slug, [row]);
    }
  }

  return [...grouped.values()].map((group) => pickByLocale(group, locale));
}

/**
 * Build a SQL query that deduplicates announcements by slug, keeping the best
 * locale variant for each slug. Uses ROW_NUMBER() window function to rank
 * locale variants per slug by priority:
 *   1. Requested locale
 *   2. Default locale (en)
 *   3. Any other locale
 *
 * The result is ordered by pinned_at DESC NULLS LAST, published_at DESC,
 * then paginated with LIMIT/OFFSET applied after deduplication.
 */
async function getDeduplicatedAnnouncements(
  locale: string,
  limit: number,
  offset: number
): Promise<Announcement[]> {
  const rows = await db.execute<Announcement>(sql`
    SELECT
      id,
      slug,
      title,
      content,
      locale,
      status,
      visibility,
      pinned_at AS "pinnedAt",
      published_at AS "publishedAt",
      created_at AS "createdAt",
      updated_at AS "updatedAt"
    FROM (
      SELECT *,
        ROW_NUMBER() OVER (
          PARTITION BY ${announcements.slug}
          ORDER BY
            CASE ${announcements.locale}
              WHEN ${locale} THEN 0
              WHEN ${DEFAULT_LOCALE} THEN 1
              ELSE 2
            END
        ) AS rn
      FROM ${announcements}
      WHERE ${announcements.status} = 'published'
    ) ranked
    WHERE rn = 1
    ORDER BY pinned_at DESC NULLS LAST, published_at DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `);

  return rows;
}

/**
 * Get all published public announcements (used by generateStaticParams).
 * Does NOT deduplicate by slug — callers extract unique slugs themselves.
 * Filters by visibility='public' because generateStaticParams should only
 * produce paths for publicly accessible announcements.
 */
export async function getPublishedAnnouncements(): Promise<Announcement[]> {
  return db
    .select()
    .from(announcements)
    .where(and(eq(announcements.status, 'published'), eq(announcements.visibility, 'public')))
    .orderBy(...pinnedFirstOrdering);
}

/**
 * Get paginated announcements for the listing page, deduplicated by slug.
 * Each slug appears once, preferring the requested locale version.
 * Does NOT filter by visibility — the listing page shows members_only
 * announcements with a lock badge.
 */
export async function getPublishedAnnouncementsPaginated(
  locale: string,
  limit: number,
  offset: number
): Promise<Announcement[]> {
  return getDeduplicatedAnnouncements(locale, limit, offset);
}

/**
 * Count published announcements deduplicated by slug.
 * Does NOT filter by visibility — mirrors getPublishedAnnouncementsPaginated.
 */
export async function getPublishedAnnouncementCount(): Promise<number> {
  const [result] = await db
    .select({ count: sql<number>`COUNT(DISTINCT ${announcements.slug})` })
    .from(announcements)
    .where(eq(announcements.status, 'published'));

  return Number(result.count);
}

/**
 * Get a single published announcement by slug.
 * Fetches all locale variants for the slug and picks the best match:
 *   1. Requested locale
 *   2. Default locale (en)
 *   3. Any available locale
 * Does NOT filter by visibility — the page component handles
 * members_only access control so it can show the login prompt.
 */
export async function getPublishedAnnouncement(
  slug: string,
  locale: string
): Promise<Announcement | null> {
  const results = await db
    .select()
    .from(announcements)
    .where(and(eq(announcements.slug, slug), eq(announcements.status, 'published')));

  if (results.length === 0) return null;

  return pickByLocale(results, locale);
}

/**
 * Get the latest published public announcement for the top banner.
 * Filters: status='published', visibility='public', publishedAt set, publishedAt within BANNER_DISPLAY_DAYS.
 * Returns null if no matching announcement exists.
 *
 * Wrapped with unstable_cache (cross-request, 300s revalidation) and
 * React.cache (per-request deduplication).
 */
export const getLatestBannerAnnouncement = cache(
  unstable_cache(
    async (locale: string): Promise<Announcement | null> => {
      const cutoff = new Date(Date.now() - BANNER_DISPLAY_DAYS * 24 * 60 * 60 * 1000);

      const rows = await db
        .select()
        .from(announcements)
        .where(
          and(
            eq(announcements.status, 'published'),
            eq(announcements.visibility, 'public'),
            isNotNull(announcements.publishedAt),
            gte(announcements.publishedAt, cutoff)
          )
        )
        .orderBy(desc(announcements.publishedAt));

      if (rows.length === 0) return null;

      return deduplicateBySlug(rows, locale)[0] ?? null;
    },
    ['latest-banner-announcement'],
    { tags: ['announcements'], revalidate: 300 }
  )
);
