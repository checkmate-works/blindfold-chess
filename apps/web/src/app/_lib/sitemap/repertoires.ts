import type { MetadataRoute } from 'next';

import { SUPPORTED_LOCALES } from '@/config';
import { and, eq, isNull } from 'drizzle-orm';

import { db, repertoires } from '@/lib/db';

import { BASE_URL, buildSitemapSection, generateAlternates } from './shared';

export async function buildRepertoireEntries(now: Date): Promise<MetadataRoute.Sitemap> {
  return buildSitemapSection('Error fetching repertoires for sitemap', async () => {
    const entries: MetadataRoute.Sitemap = [];
    const publicRepertoires = await db
      .select({ id: repertoires.id })
      .from(repertoires)
      .where(and(eq(repertoires.status, 'public'), isNull(repertoires.deletedAt)));

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
