import type { MetadataRoute } from 'next';

import { buildAnnouncementEntries } from './_lib/sitemap/announcements';
import { buildArticleEntries } from './_lib/sitemap/articles';
import { buildGlossaryEntries } from './_lib/sitemap/glossary';
import { buildGuideEntries } from './_lib/sitemap/guides';
import { buildInterviewEntries } from './_lib/sitemap/interview';
import { buildLeaderboardEntries } from './_lib/sitemap/leaderboard';
import { buildLearnArticleEntries, buildManualSectionEntries } from './_lib/sitemap/learn';
import {
  buildPositionMemoryProfileEntries,
  buildPuzzleProfileEntries,
} from './_lib/sitemap/problems';
import { buildRankEntries } from './_lib/sitemap/ranks';
import { buildRepertoireEntries } from './_lib/sitemap/repertoires';
import { buildRootEntry, buildStaticPageEntries } from './_lib/sitemap/static-pages';
import { buildOpeningTopicEntries, buildSquareTopicEntries } from './_lib/sitemap/topics';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const sections: MetadataRoute.Sitemap[] = [
    buildRootEntry(now),
    buildStaticPageEntries(now),
    await buildLearnArticleEntries(now),
    await buildManualSectionEntries(now),
    await buildGlossaryEntries(now),
    await buildArticleEntries(now),
    await buildAnnouncementEntries(now),
    buildRankEntries(now),
    buildLeaderboardEntries(now),
    buildGuideEntries(now),
    await buildOpeningTopicEntries(now),
    await buildSquareTopicEntries(now),
    await buildRepertoireEntries(now),
    await buildPuzzleProfileEntries(now),
    await buildPositionMemoryProfileEntries(now),
    buildInterviewEntries(now),
  ];

  return sections.flat();
}
