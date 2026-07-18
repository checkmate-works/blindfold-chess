import type { MetadataRoute } from 'next';

import { SUPPORTED_LOCALES } from '@/config';
import * as Sentry from '@sentry/nextjs';
import { and, eq, isNull } from 'drizzle-orm';

import { db, repertoires } from '@/lib/db';

import { BASE_URL, generateAlternates } from './shared';

export async function buildRepertoireEntries(now: Date): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  try {
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
  } catch (error) {
    console.error('Error fetching repertoires for sitemap:', error);
    Sentry.captureException(error);
  }

  return entries;
}
