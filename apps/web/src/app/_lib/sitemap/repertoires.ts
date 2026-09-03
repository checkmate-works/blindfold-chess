import type { MetadataRoute } from 'next';

import { SUPPORTED_LOCALES } from '@/config';

import { db, repertoires } from '@/lib/db';
import { publicRepertoiresOnly } from '@/lib/repertoires/queries';

import { BASE_URL, buildSitemapSection, generateAlternates } from './shared';

export async function buildRepertoireEntries(now: Date): Promise<MetadataRoute.Sitemap> {
  return buildSitemapSection('Error fetching repertoires for sitemap', async () => {
    const entries: MetadataRoute.Sitemap = [];
    const publicRepertoires = await db
      .select({ id: repertoires.id })
      .from(repertoires)
      .where(publicRepertoiresOnly());

    for (const { id } of publicRepertoires) {
      const path = `/repertoires/${id}`;
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
