import { unstable_cache } from 'next/cache';

import { DEFAULT_LOCALE } from '@/config';
import { isSupportedLocale } from '@blindfold-chess/features/locale';
import { and, eq, sql } from 'drizzle-orm';
import 'server-only';

import { ANNOUNCEMENTS_CACHE_TAG } from '@/lib/cache-tags';
import { announcements, db } from '@/lib/db';
import { publiclyVisibleAnnouncement } from '@/lib/db/announcements-visibility';

import { pickByLocale } from '@/app/[locale]/_lib/locale-utils';

/**
 * The announcements the app shows: the public ones only. A members-only
 * announcement needs the web's sign-in gate in front of its body, which the
 * app's public read does not have, so the app lists none of them rather than
 * listing titles it cannot open.
 *
 * Each slug appears once, in the reader's locale when it has that row, else
 * in the default locale, else in whichever locale it was written — the web
 * listing's rule, so the app and the web show the same text side by side.
 */

/** How many rows one page of the app's list holds; the web listing's size. */
export const MOBILE_ANNOUNCEMENTS_PER_PAGE = 20;

export type MobileAnnouncementSummary = {
  slug: string;
  title: string;
  /** ISO 8601. Always set: an announcement without it is not published. */
  publishedAt: string;
  pinned: boolean;
};

export type MobileAnnouncementPage = {
  items: MobileAnnouncementSummary[];
  /** The page returned, 1-based; a page past the end is clamped to the last. */
  page: number;
  /** At least 1, so an empty list is one empty page. */
  totalPages: number;
};

export type MobileAnnouncement = {
  slug: string;
  title: string;
  /** Markdown, the same source the web's page renders. */
  content: string;
  publishedAt: string;
};

/** The listing row as the query hands it back. */
export type AnnouncementListingRow = {
  slug: string;
  title: string;
  locale: string;
  pinnedAt: Date | string | null;
  publishedAt: Date | string | null;
};

const toIso = (value: Date | string | null): string | null =>
  value instanceof Date ? value.toISOString() : value;

/** The `?locale=` the app sent, or the default for a missing or unknown one. */
export function mobileAnnouncementLocale(value: string | null): string {
  return value !== null && isSupportedLocale(value) ? value : DEFAULT_LOCALE;
}

/** The 1-based page the app asked for; anything that is not a positive integer is 1. */
export function mobileAnnouncementPageNumber(value: string | null): number {
  const page = value === null ? NaN : Number(value);
  return Number.isInteger(page) && page >= 1 ? page : 1;
}

/**
 * One page of the list from every public row, already in the listing's order
 * (pinned first, then newest first). Picking a slug's locale here rather than
 * in SQL keeps a slug where its first row sits, which is where the order puts
 * the slug as a whole.
 */
export function toMobileAnnouncementPage(
  rows: readonly AnnouncementListingRow[],
  locale: string,
  page: number
): MobileAnnouncementPage {
  const bySlug = new Map<string, AnnouncementListingRow[]>();
  for (const row of rows) {
    const group = bySlug.get(row.slug);
    if (group) group.push(row);
    else bySlug.set(row.slug, [row]);
  }
  const items = [...bySlug.values()].flatMap((group): MobileAnnouncementSummary[] => {
    const row = pickByLocale(group, locale);
    const publishedAt = toIso(row.publishedAt);
    if (publishedAt === null) return [];
    return [{ slug: row.slug, title: row.title, publishedAt, pinned: row.pinnedAt !== null }];
  });
  const totalPages = Math.max(1, Math.ceil(items.length / MOBILE_ANNOUNCEMENTS_PER_PAGE));
  const current = Math.min(page, totalPages);
  const start = (current - 1) * MOBILE_ANNOUNCEMENTS_PER_PAGE;
  return {
    items: items.slice(start, start + MOBILE_ANNOUNCEMENTS_PER_PAGE),
    page: current,
    totalPages,
  };
}

/**
 * Every public announcement's listing columns, every locale. The home tab
 * reads this each time it comes into focus, so it is cached on the
 * announcements tag (admin CRUD expires it) rather than spending a pooled
 * connection per read; the daily timer is only the safety net. The body is
 * left out: the list shows none of it.
 */
const getPublicAnnouncementRows = unstable_cache(
  async (): Promise<AnnouncementListingRow[]> => {
    const rows = await db
      .select({
        slug: announcements.slug,
        title: announcements.title,
        locale: announcements.locale,
        pinnedAt: announcements.pinnedAt,
        publishedAt: announcements.publishedAt,
      })
      .from(announcements)
      .where(publiclyVisibleAnnouncement())
      .orderBy(
        sql`${announcements.pinnedAt} DESC NULLS LAST`,
        sql`${announcements.publishedAt} DESC`
      );
    // The Data Cache round-trips its value through JSON, so a hit hands back
    // strings where a miss hands back Dates; normalise both to strings.
    return rows.map((row) => ({
      ...row,
      pinnedAt: toIso(row.pinnedAt),
      publishedAt: toIso(row.publishedAt),
    }));
  },
  ['mobile-public-announcements'],
  { tags: [ANNOUNCEMENTS_CACHE_TAG], revalidate: 86400 }
);

export async function listMobileAnnouncements(
  locale: string,
  page: number
): Promise<MobileAnnouncementPage> {
  return toMobileAnnouncementPage(await getPublicAnnouncementRows(), locale, page);
}

const getPublicAnnouncementVariants = unstable_cache(
  async (slug: string) => {
    const rows = await db
      .select({
        slug: announcements.slug,
        title: announcements.title,
        content: announcements.content,
        locale: announcements.locale,
        publishedAt: announcements.publishedAt,
      })
      .from(announcements)
      .where(and(eq(announcements.slug, slug), publiclyVisibleAnnouncement()));
    return rows.map((row) => ({ ...row, publishedAt: toIso(row.publishedAt) }));
  },
  ['mobile-public-announcement'],
  { tags: [ANNOUNCEMENTS_CACHE_TAG], revalidate: 86400 }
);

/** One public announcement in the reader's locale (the list's rule), or null. */
export async function getMobileAnnouncement(
  slug: string,
  locale: string
): Promise<MobileAnnouncement | null> {
  const rows = await getPublicAnnouncementVariants(slug);
  if (rows.length === 0) return null;
  const row = pickByLocale(rows, locale);
  if (row.publishedAt === null) return null;
  return { slug: row.slug, title: row.title, content: row.content, publishedAt: row.publishedAt };
}
