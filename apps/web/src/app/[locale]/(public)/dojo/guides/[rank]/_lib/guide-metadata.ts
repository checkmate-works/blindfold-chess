import { getTranslations } from 'next-intl/server';

import { SITE_URL } from '@/config';

import type { RankSlug } from '@/lib/db/data/ranks';
import { buildGuidePath, buildGuidePathRelative } from '@/lib/guides';
import type { ChapteredGuide } from '@/lib/guides';
import { generateItemListSchema, generateLearningResourceSchema } from '@/lib/seo/jsonld';

import type { BreadcrumbItem } from '@/app/[locale]/_components/Breadcrumb';
import type { Locale } from '@/app/[locale]/_lib/types';

/**
 * Metadata builders (JSON-LD schemas + breadcrumbs) for the dojo/guides/[rank]
 * page family. These are pure (modulo i18n I/O) and deliberately live outside
 * the body renderer so a future page-level caller can reuse them without
 * paying the full render cost.
 */

type Translator = (key: string, values?: Record<string, string | number | Date>) => string;

// ---------------------------------------------------------------------------
// Breadcrumbs
// ---------------------------------------------------------------------------

export function buildChapterListBreadcrumbs(
  tGuides: Translator,
  rankName: string
): BreadcrumbItem[] {
  return [
    { label: tGuides('breadcrumb.dojo'), href: '/dojo' },
    { label: tGuides('breadcrumb.guides'), href: '/dojo/guides' },
    { label: rankName },
  ];
}

export function buildFlatBodyBreadcrumbs(
  tGuides: Translator,
  tRanks: Translator,
  rankSlug: RankSlug,
  rankName: string,
  pageNumber: number,
  totalPages: number
): BreadcrumbItem[] {
  return [
    { label: tGuides('breadcrumb.dojo'), href: '/dojo' },
    { label: tGuides('breadcrumb.guides'), href: '/dojo/guides' },
    { label: rankName, href: buildGuidePathRelative(rankSlug, { kind: 'root' }) },
    ...(pageNumber > 1
      ? [{ label: tRanks('detail.pageOf', { current: pageNumber, total: totalPages }) }]
      : []),
  ];
}

export function buildChapterBodyBreadcrumbs(
  tGuides: Translator,
  tRanks: Translator,
  rankSlug: RankSlug,
  rankName: string,
  chapterSlug: string,
  chapterTitle: string,
  pageNumber: number,
  totalPages: number
): BreadcrumbItem[] {
  return [
    { label: tGuides('breadcrumb.dojo'), href: '/dojo' },
    { label: tGuides('breadcrumb.guides'), href: '/dojo/guides' },
    { label: rankName, href: buildGuidePathRelative(rankSlug, { kind: 'root' }) },
    {
      label: chapterTitle,
      href: buildGuidePathRelative(rankSlug, { kind: 'chapter-root', chapterSlug }),
    },
    ...(pageNumber > 1
      ? [
          {
            label: tRanks('detail.pageOf', {
              current: pageNumber,
              total: totalPages,
            }),
          },
        ]
      : []),
  ];
}

// ---------------------------------------------------------------------------
// JSON-LD schemas
// ---------------------------------------------------------------------------

export function buildChapterListItemListSchema(
  locale: Locale,
  rankSlug: RankSlug,
  guide: ChapteredGuide
) {
  const itemListItems = guide.chapters.map((chapter) => ({
    name: chapter.title,
    url: `${SITE_URL}${buildGuidePath(locale, rankSlug, {
      kind: 'chapter-root',
      chapterSlug: chapter.slug,
    })}`,
  }));
  return generateItemListSchema(itemListItems);
}

export async function buildFlatBodyLearningResourceSchema(params: {
  locale: Locale;
  rankSlug: RankSlug;
  rankName: string;
  pageNumber: number;
  totalPages: number;
}) {
  const { locale, rankSlug, rankName, pageNumber, totalPages } = params;
  const tMetaRank = await getTranslations({ locale, namespace: 'metadata.guides.rank' });
  const name =
    pageNumber === 1
      ? tMetaRank('title', { rankName })
      : tMetaRank('pageTitle', { rankName, page: pageNumber });
  const description =
    pageNumber === 1
      ? tMetaRank('description', { rankName })
      : tMetaRank('descriptionWithPage', { rankName, page: pageNumber, total: totalPages });
  const path =
    pageNumber === 1
      ? buildGuidePath(locale, rankSlug, { kind: 'root' })
      : buildGuidePath(locale, rankSlug, { kind: 'flat-page', page: pageNumber });
  const url = `${SITE_URL}${path}`;

  return generateLearningResourceSchema({
    name,
    description,
    url,
    inLanguage: locale,
    educationalLevel: rankName,
    learningResourceType: 'Guide',
  });
}

export async function buildChapterBodyLearningResourceSchema(params: {
  locale: Locale;
  rankSlug: RankSlug;
  rankName: string;
  chapterSlug: string;
  chapterTitle: string;
  pageNumber: number;
  totalPages: number;
}) {
  const { locale, rankSlug, rankName, chapterSlug, chapterTitle, pageNumber, totalPages } = params;
  const tMetaChapter = await getTranslations({ locale, namespace: 'metadata.guides.chapter' });
  const name =
    pageNumber === 1
      ? tMetaChapter('title', { rankName, chapterName: chapterTitle })
      : tMetaChapter('pageTitle', { rankName, chapterName: chapterTitle, page: pageNumber });
  const description =
    pageNumber === 1
      ? tMetaChapter('description', { rankName, chapterName: chapterTitle })
      : tMetaChapter('descriptionWithPage', {
          rankName,
          chapterName: chapterTitle,
          page: pageNumber,
          total: totalPages,
        });
  const path =
    pageNumber === 1
      ? buildGuidePath(locale, rankSlug, { kind: 'chapter-root', chapterSlug })
      : buildGuidePath(locale, rankSlug, {
          kind: 'chapter-page',
          chapterSlug,
          page: pageNumber,
        });
  const url = `${SITE_URL}${path}`;

  return generateLearningResourceSchema({
    name,
    description,
    url,
    inLanguage: locale,
    educationalLevel: rankName,
    learningResourceType: 'Guide',
    teaches: chapterTitle,
  });
}
