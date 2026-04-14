import type { RankSlug } from '@/lib/db/data/ranks';

export type GuidePage = {
  paragraphs: string[];
};

export type GuideChapter = {
  slug: string;
  title: string;
  description: string;
  pages: GuidePage[];
};

export type FlatGuide = {
  format: 'flat';
  pages: GuidePage[];
};

export type ChapteredGuide = {
  format: 'chaptered';
  chapters: GuideChapter[];
};

export type RankGuide = FlatGuide | ChapteredGuide;

/**
 * Resolve the guide definition for a rank slug from `guides.pages` translations.
 * Returns `null` if the rank has no guide data configured.
 */
export function getRankGuide(
  guidesPages: Record<string, unknown>,
  slug: RankSlug
): RankGuide | null {
  const raw = guidesPages[slug];
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as Partial<RankGuide>;
  if (candidate.format === 'flat' && Array.isArray((candidate as FlatGuide).pages)) {
    return candidate as FlatGuide;
  }
  if (candidate.format === 'chaptered' && Array.isArray((candidate as ChapteredGuide).chapters)) {
    return candidate as ChapteredGuide;
  }
  return null;
}

export function findChapter(guide: ChapteredGuide, chapterSlug: string): GuideChapter | null {
  return guide.chapters.find((c) => c.slug === chapterSlug) ?? null;
}
