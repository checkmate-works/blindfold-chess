import { and, desc, eq, gte, isNotNull, sql } from 'drizzle-orm';

import { type Announcement, announcements, db } from '@/lib/db';

const DEFAULT_LOCALE = 'en';

const pinnedFirstOrdering = [
  sql`${announcements.pinnedAt} DESC NULLS LAST`,
  desc(announcements.publishedAt),
];

/**
 * Pick the best locale variant from a group of announcements sharing the same slug.
 * Priority: requested locale > default locale (en) > first available.
 */
function pickByLocale(rows: Announcement[], locale: string): Announcement {
  return (
    rows.find((a) => a.locale === locale) ??
    rows.find((a) => a.locale === DEFAULT_LOCALE) ??
    rows[0]
  );
}

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
  const rows = await db
    .select()
    .from(announcements)
    .where(eq(announcements.status, 'published'))
    .orderBy(...pinnedFirstOrdering);

  return deduplicateBySlug(rows, locale).slice(offset, offset + limit);
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
 * Filters: status='published', visibility='public', publishedAt set, publishedAt within 1 week.
 * Returns null if no matching announcement exists.
 */
export async function getLatestBannerAnnouncement(locale: string): Promise<Announcement | null> {
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const rows = await db
    .select()
    .from(announcements)
    .where(
      and(
        eq(announcements.status, 'published'),
        eq(announcements.visibility, 'public'),
        isNotNull(announcements.publishedAt),
        gte(announcements.publishedAt, oneWeekAgo)
      )
    )
    .orderBy(desc(announcements.publishedAt));

  if (rows.length === 0) return null;

  return deduplicateBySlug(rows, locale)[0] ?? null;
}
