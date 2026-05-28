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
 *
 * Returns the chosen announcement together with `availableLocales`, the list
 * of locales for which this slug actually has a row. Callers feed
 * `availableLocales` into `generateCanonicalMetadata` so hreflang entries are
 * only emitted for locales that actually have a translation. Mirrors the
 * shape of `getPublishedArticle`.
 */
export const getPublishedAnnouncement = cache(
  async (
    slug: string,
    locale: string
  ): Promise<{ announcement: Announcement; availableLocales: string[] } | null> => {
    const results = await db
      .select()
      .from(announcements)
      .where(and(eq(announcements.slug, slug), eq(announcements.status, 'published')));

    if (results.length === 0) return null;

    const availableLocales = results.map((r) => r.locale);
    return { announcement: pickByLocale(results, locale), availableLocales };
  }
);

/**
 * Get the latest published public announcement for the top banner.
 * Filters: status='published', visibility='public', showAsBanner=true,
 * publishedAt set, publishedAt within BANNER_DISPLAY_DAYS.
 * Returns null if no matching announcement exists.
 *
 * `showAsBanner` is an explicit per-announcement opt-in: publishing alone does
 * not surface a banner. The BANNER_DISPLAY_DAYS window still applies on top, so
 * an opted-in banner auto-expires after a few days even if left checked.
 *
 * Wrapped with unstable_cache (cross-request, 24h revalidation, tag-driven)
 * and React.cache (per-request deduplication).
 *
 * @design 24h revalidate, not minutes
 * This function is consumed by `<Header>` inside `[locale]/layout.tsx`, so
 * every page in the `[locale]/(public)` subtree reads it on render. Under
 * Next.js 16's segment cache, when this data-cache entry invalidates, the
 * route cache for every page that read it invalidates too — and PPR splits
 * each page into ~4 cache segments (`_tree`, `_head`, layout,
 * `__PAGE__`), so one logical page invalidation is ~4 ISR Writes.
 *
 * The previous `revalidate: 300` therefore amplified to: (every page) ×
 * 4 segments × 288 (5-min slots/day) writes/day, which dominated the
 * project's ISR Writes spend in production (Vercel Observability → ISR
 * Cache showed the static info pages — terms, privacy, faq, manual,
 * preferences, etc. — racking up ~50–70 writes/day each despite no
 * `export const revalidate` on those routes).
 *
 * Admin announcement CRUD calls `revalidateTag('announcements', ...)`,
 * so newly published banners surface immediately. The 24h timer is only
 * the upper bound for the "no banner currently set, then one is added by
 * a service-role / SQL path that doesn't go through the admin action" —
 * which is not a path we use. Going longer than 24h is fine in principle;
 * 24h is just the conventional safety net.
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
            eq(announcements.showAsBanner, true),
            isNotNull(announcements.publishedAt),
            gte(announcements.publishedAt, cutoff)
          )
        )
        .orderBy(desc(announcements.publishedAt));

      if (rows.length === 0) return null;

      return deduplicateBySlug(rows, locale)[0] ?? null;
    },
    ['latest-banner-announcement'],
    { tags: ['announcements'], revalidate: 86400 }
  )
);
