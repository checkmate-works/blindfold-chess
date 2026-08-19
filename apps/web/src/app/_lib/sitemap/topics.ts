import type { MetadataRoute } from 'next';

import { SUPPORTED_LOCALES } from '@/config';

import { db, topicPosts } from '@/lib/db';

import { liveTopLevelPosts } from '@/app/[locale]/(public)/topics/_lib/post-filters';

import { BASE_URL, buildSitemapSection, generateAlternates } from './shared';

export async function buildOpeningTopicEntries(now: Date): Promise<MetadataRoute.Sitemap> {
  return buildSitemapSection('Error fetching opening topics for sitemap', async () => {
    const entries: MetadataRoute.Sitemap = [];
    const openingTopics = await db
      .selectDistinct({ topicKey: topicPosts.topicKey })
      .from(topicPosts)
      .where(liveTopLevelPosts('opening'));

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
    return entries;
  });
}

export async function buildSquareTopicEntries(now: Date): Promise<MetadataRoute.Sitemap> {
  return buildSitemapSection('Error fetching square topics for sitemap', async () => {
    const entries: MetadataRoute.Sitemap = [];
    const squareTopics = await db
      .selectDistinct({ topicKey: topicPosts.topicKey })
      .from(topicPosts)
      .where(liveTopLevelPosts('square'));

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
    return entries;
  });
}
