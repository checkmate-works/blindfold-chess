import { and, count, desc, eq, isNotNull, sql } from 'drizzle-orm';

import { type Announcement, announcements, db } from '@/lib/db';

const pinnedFirstOrdering = [
  sql`${announcements.pinnedAt} DESC NULLS LAST`,
  desc(announcements.publishedAt),
];

export async function getPublishedAnnouncements(locale: string): Promise<Announcement[]> {
  return db
    .select()
    .from(announcements)
    .where(
      and(
        eq(announcements.status, 'published'),
        eq(announcements.locale, locale),
        eq(announcements.visibility, 'public'),
        isNotNull(announcements.publishedAt)
      )
    )
    .orderBy(...pinnedFirstOrdering);
}

export async function getPublishedAnnouncementsPaginated(
  locale: string,
  limit: number,
  offset: number
): Promise<Announcement[]> {
  return db
    .select()
    .from(announcements)
    .where(
      and(
        eq(announcements.status, 'published'),
        eq(announcements.locale, locale),
        isNotNull(announcements.publishedAt)
      )
    )
    .orderBy(...pinnedFirstOrdering)
    .limit(limit)
    .offset(offset);
}

export async function getPublishedAnnouncementCount(locale: string): Promise<number> {
  const [result] = await db
    .select({ count: count() })
    .from(announcements)
    .where(
      and(
        eq(announcements.status, 'published'),
        eq(announcements.locale, locale),
        isNotNull(announcements.publishedAt)
      )
    );

  return result.count;
}

/**
 * Get a single published announcement by slug.
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
    .where(
      and(
        eq(announcements.slug, slug),
        eq(announcements.locale, locale),
        eq(announcements.status, 'published'),
        isNotNull(announcements.publishedAt)
      )
    )
    .limit(1);

  return results[0] || null;
}
