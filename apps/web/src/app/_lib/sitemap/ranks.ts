import type { MetadataRoute } from 'next';

import { SUPPORTED_LOCALES } from '@/config';

import { ALL_RANK_SLUGS } from '@/lib/db/data/ranks';

import { BASE_URL, generateAlternates } from './shared';

export function buildRankEntries(now: Date): MetadataRoute.Sitemap {
  const entries: MetadataRoute.Sitemap = [];

  for (const slug of ALL_RANK_SLUGS) {
    const path = `/dojo/ranks/${slug}`;
    for (const locale of SUPPORTED_LOCALES) {
      entries.push({
        url: `${BASE_URL}/${locale}${path}`,
        lastModified: now,
        alternates: generateAlternates(path),
      });
    }
  }

  return entries;
}
