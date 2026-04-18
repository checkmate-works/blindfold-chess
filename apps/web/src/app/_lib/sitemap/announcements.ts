import type { MetadataRoute } from 'next';

import { SUPPORTED_LOCALES } from '@/config';
import * as Sentry from '@sentry/nextjs';

import { getPublishedAnnouncements } from '@/app/[locale]/(public)/announcements/_lib/queries';

import { BASE_URL, generateAlternates } from './shared';

export async function buildAnnouncementEntries(now: Date): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  try {
    const allAnnouncements = await getPublishedAnnouncements();
    const seenSlugs = new Set<string>();

    for (const announcement of allAnnouncements) {
      if (seenSlugs.has(announcement.slug)) continue;
      seenSlugs.add(announcement.slug);

      const path = `/announcements/${announcement.slug}`;
      for (const locale of SUPPORTED_LOCALES) {
        entries.push({
          url: `${BASE_URL}/${locale}${path}`,
          lastModified: announcement.publishedAt ?? now,
          alternates: generateAlternates(path),
        });
      }
    }
  } catch (error) {
    console.error('Error fetching announcements for sitemap:', error);
    Sentry.captureException(error);
  }

  return entries;
}
