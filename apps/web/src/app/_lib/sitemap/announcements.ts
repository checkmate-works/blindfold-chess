import type { MetadataRoute } from 'next';

import * as Sentry from '@sentry/nextjs';

import type { Announcement } from '@/lib/db/schema/tables';

import { getPublishedAnnouncements } from '@/app/[locale]/(public)/announcements/_lib/queries';

import { BASE_URL, generateAlternates } from './shared';

export async function buildAnnouncementEntries(now: Date): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  try {
    const allAnnouncements = await getPublishedAnnouncements();

    // Group rows by slug so each entry can emit sitemap alternates only for
    // the locales that actually have a published announcement row. Emit one
    // entry per (slug, locale) pair — locales without a row are intentionally
    // omitted to keep the sitemap consistent with the page-level hreflang
    // signals produced by `generateCanonicalMetadata`.
    const rowsBySlug = new Map<string, Announcement[]>();
    for (const announcement of allAnnouncements) {
      const group = rowsBySlug.get(announcement.slug);
      if (group) {
        group.push(announcement);
      } else {
        rowsBySlug.set(announcement.slug, [announcement]);
      }
    }

    for (const [slug, group] of rowsBySlug) {
      const path = `/announcements/${slug}`;
      const availableLocales = group.map((row) => row.locale);
      for (const announcement of group) {
        entries.push({
          url: `${BASE_URL}/${announcement.locale}${path}`,
          lastModified: announcement.publishedAt ?? now,
          alternates: generateAlternates(path, availableLocales),
        });
      }
    }
  } catch (error) {
    console.error('Error fetching announcements for sitemap:', error);
    Sentry.captureException(error);
  }

  return entries;
}
