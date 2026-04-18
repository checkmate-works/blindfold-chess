import type { MetadataRoute } from 'next';

import { SUPPORTED_LOCALES } from '@/config';
import * as Sentry from '@sentry/nextjs';
import { and, eq, isNull } from 'drizzle-orm';

import { db, topicPosts } from '@/lib/db';

import { BASE_URL, generateAlternates } from './shared';

export async function buildOpeningTopicEntries(now: Date): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  try {
    const openingTopics = await db
      .selectDistinct({ topicKey: topicPosts.topicKey })
      .from(topicPosts)
      .where(
        and(
          eq(topicPosts.topicType, 'opening'),
          isNull(topicPosts.parentId),
          isNull(topicPosts.deletedAt)
        )
      );

    for (const { topicKey } of openingTopics) {
      const path = `/topics/openings/${topicKey}`;
      for (const locale of SUPPORTED_LOCALES) {
        entries.push({
          url: `${BASE_URL}/${locale}${path}`,
          lastModified: now,
          alternates: generateAlternates(path),
        });
      }
    }
  } catch (error) {
    console.error('Error fetching opening topics for sitemap:', error);
    Sentry.captureException(error);
  }

  return entries;
}

export async function buildSquareTopicEntries(now: Date): Promise<MetadataRoute.Sitemap> {
  const entries: MetadataRoute.Sitemap = [];

  try {
    const squareTopics = await db
      .selectDistinct({ topicKey: topicPosts.topicKey })
      .from(topicPosts)
      .where(
        and(
          eq(topicPosts.topicType, 'square'),
          isNull(topicPosts.parentId),
          isNull(topicPosts.deletedAt)
        )
      );

    for (const { topicKey } of squareTopics) {
      const path = `/topics/squares/${topicKey}`;
      for (const locale of SUPPORTED_LOCALES) {
        entries.push({
          url: `${BASE_URL}/${locale}${path}`,
          lastModified: now,
          alternates: generateAlternates(path),
        });
      }
    }
  } catch (error) {
    console.error('Error fetching square topics for sitemap:', error);
    Sentry.captureException(error);
  }

  return entries;
}
